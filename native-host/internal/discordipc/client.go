package discordipc

import (
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"sync"
	"time"

	"github.com/PKrystian/listen-presence/native-host/internal/nativeprotocol"
)

const (
	opcodeHandshake = 0
	opcodeFrame     = 1
	opcodeClose     = 2
	opcodePing      = 3
	opcodePong      = 4
)

type rpcPacket struct {
	Opcode  uint32
	Payload []byte
}

type rpcEnvelope struct {
	Cmd   string          `json:"cmd"`
	Data  json.RawMessage `json:"data"`
	Evt   *string         `json:"evt"`
	Error *rpcError       `json:"error"`
}

type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type Client struct {
	mu           sync.Mutex
	application  string
	pid          int
	connection   io.ReadWriteCloser
	activity     *nativeprotocol.Activity
	lastError    string
	activitySet  bool
	pipeAttempts int
}

func New(application string) *Client {
	return &Client{
		application: application,
		pid:         os.Getpid(),
	}
}

func (client *Client) SetActivity(activity nativeprotocol.Activity) error {
	client.mu.Lock()
	defer client.mu.Unlock()
	client.activity = cloneActivity(activity)
	client.activitySet = false
	if err := client.ensureConnectedLocked(); err != nil {
		return err
	}
	if err := client.setActivityLocked(activity); err != nil {
		client.resetLocked(err)
		if reconnectErr := client.ensureConnectedLocked(); reconnectErr == nil {
			if retryErr := client.setActivityLocked(activity); retryErr == nil {
				client.activity = cloneActivity(activity)
				client.activitySet = true
				return nil
			}
		}
		return err
	}
	client.activity = cloneActivity(activity)
	client.activitySet = true
	client.lastError = ""
	return nil
}

func (client *Client) ClearActivity() error {
	client.mu.Lock()
	defer client.mu.Unlock()
	client.activity = nil
	client.activitySet = false
	if client.connection == nil {
		return nil
	}
	if err := client.sendActivityLocked(nil); err != nil {
		client.resetLocked(err)
		return err
	}
	client.lastError = ""
	return nil
}

func (client *Client) Probe() {
	client.mu.Lock()
	defer client.mu.Unlock()
	if client.connection == nil {
		if err := client.ensureConnectedLocked(); err != nil {
			return
		}
	}
	if err := client.pingLocked(); err != nil {
		client.resetLocked(err)
	}
}

func (client *Client) ReconnectIfNeeded() {
	client.mu.Lock()
	defer client.mu.Unlock()
	if client.activity == nil {
		return
	}
	if client.connection != nil {
		if err := client.pingLocked(); err != nil {
			client.resetLocked(err)
		}
		return
	}
	if err := client.ensureConnectedLocked(); err != nil {
		return
	}
	if err := client.setActivityLocked(*client.activity); err != nil {
		client.resetLocked(err)
		return
	}
	client.activitySet = true
	client.lastError = ""
}

func (client *Client) Status() nativeprotocol.Status {
	client.mu.Lock()
	defer client.mu.Unlock()
	status := nativeprotocol.Status{
		Connector: "ready",
		Discord:   "disconnected",
		Activity:  "clear",
		LastError: client.lastError,
	}
	if client.connection != nil {
		status.Discord = "connected"
	}
	if client.activitySet {
		status.Activity = "set"
	}
	return status
}

func (client *Client) ensureConnectedLocked() error {
	if client.connection != nil {
		return nil
	}
	if client.application == "" || client.application == "000000000000000000" {
		client.lastError = "Discord application ID is not configured."
		return errors.New(client.lastError)
	}
	var lastErr error
	for index := 0; index < 10; index++ {
		connection, err := openPipe(index)
		if err != nil {
			lastErr = err
			continue
		}
		if err = client.handshake(connection); err != nil {
			_ = connection.Close()
			lastErr = err
			continue
		}
		client.connection = connection
		client.pipeAttempts = index + 1
		client.lastError = ""
		return nil
	}
	if lastErr == nil {
		lastErr = errors.New("Discord IPC pipe is unavailable")
	}
	client.lastError = "Discord Desktop is not available."
	return lastErr
}

func (client *Client) handshake(connection io.ReadWriteCloser) error {
	payload, err := json.Marshal(map[string]interface{}{"v": 1, "client_id": client.application})
	if err != nil {
		return err
	}
	if err = writePacket(connection, opcodeHandshake, payload); err != nil {
		return err
	}
	for {
		packet, readErr := readPacket(connection)
		if readErr != nil {
			return readErr
		}
		if packet.Opcode == opcodeClose {
			return errors.New("Discord closed the IPC handshake")
		}
		if packet.Opcode != opcodeFrame {
			continue
		}
		var envelope rpcEnvelope
		if unmarshalErr := json.Unmarshal(packet.Payload, &envelope); unmarshalErr != nil {
			return errors.New("invalid Discord handshake response")
		}
		if envelope.Error != nil {
			return errors.New(envelope.Error.Message)
		}
		if envelope.Evt != nil && *envelope.Evt == "READY" {
			return nil
		}
	}
}

func (client *Client) setActivityLocked(activity nativeprotocol.Activity) error {
	return client.sendActivityLocked(&activity)
}

func (client *Client) sendActivityLocked(activity *nativeprotocol.Activity) error {
	args := map[string]interface{}{
		"pid":      client.pid,
		"activity": activity,
	}
	return client.sendCommandLocked("SET_ACTIVITY", args)
}

func (client *Client) pingLocked() error {
	if err := writePacket(client.connection, opcodePing, []byte(`{"nonce":"listenpresence"}`)); err != nil {
		return err
	}
	for {
		packet, err := readPacket(client.connection)
		if err != nil {
			return err
		}
		if packet.Opcode == opcodePong {
			return nil
		}
		if packet.Opcode == opcodeClose {
			return errors.New("Discord closed the IPC connection")
		}
	}
}

func (client *Client) sendCommandLocked(command string, args interface{}) error {
	if client.connection == nil {
		return errors.New("Discord IPC is not connected")
	}
	payload, err := json.Marshal(map[string]interface{}{
		"cmd":   command,
		"args":  args,
		"nonce": fmt.Sprintf("listenpresence-%d", time.Now().UnixNano()),
	})
	if err != nil {
		return err
	}
	if err = writePacket(client.connection, opcodeFrame, payload); err != nil {
		return err
	}
	for {
		packet, readErr := readPacket(client.connection)
		if readErr != nil {
			return readErr
		}
		if packet.Opcode == opcodeClose {
			return errors.New("Discord closed the IPC connection")
		}
		if packet.Opcode != opcodeFrame {
			continue
		}
		var response rpcEnvelope
		if unmarshalErr := json.Unmarshal(packet.Payload, &response); unmarshalErr != nil {
			return errors.New("invalid Discord RPC response")
		}
		if response.Error != nil {
			return errors.New(response.Error.Message)
		}
		if response.Cmd == command {
			return nil
		}
	}
}

func (client *Client) resetLocked(err error) {
	if client.connection != nil {
		_ = client.connection.Close()
	}
	client.connection = nil
	client.lastError = "Discord Desktop connection was lost."
	if err != nil {
		client.lastError = err.Error()
	}
}

func cloneActivity(activity nativeprotocol.Activity) *nativeprotocol.Activity {
	encoded, err := json.Marshal(activity)
	if err != nil {
		return nil
	}
	var clone nativeprotocol.Activity
	if json.Unmarshal(encoded, &clone) != nil {
		return nil
	}
	return &clone
}

func writePacket(writer io.Writer, opcode uint32, payload []byte) error {
	if len(payload) > nativeprotocol.MaxMessageSize {
		return errors.New("Discord IPC payload is too large")
	}
	header := make([]byte, 8)
	binary.LittleEndian.PutUint32(header[0:4], opcode)
	binary.LittleEndian.PutUint32(header[4:8], uint32(len(payload)))
	if _, err := writer.Write(header); err != nil {
		return err
	}
	_, err := writer.Write(payload)
	return err
}

func readPacket(reader io.Reader) (rpcPacket, error) {
	header := make([]byte, 8)
	if _, err := io.ReadFull(reader, header); err != nil {
		return rpcPacket{}, err
	}
	length := binary.LittleEndian.Uint32(header[4:8])
	if length > nativeprotocol.MaxMessageSize {
		return rpcPacket{}, errors.New("Discord IPC payload is too large")
	}
	payload := make([]byte, length)
	if _, err := io.ReadFull(reader, payload); err != nil {
		return rpcPacket{}, err
	}
	return rpcPacket{Opcode: binary.LittleEndian.Uint32(header[0:4]), Payload: payload}, nil
}
