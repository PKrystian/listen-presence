package connector

import (
	"encoding/json"
	"errors"
	"io"
	"time"

	"github.com/PKrystian/listen-presence/native-host/internal/discordipc"
	"github.com/PKrystian/listen-presence/native-host/internal/nativeprotocol"
)

type Connector struct {
	discord *discordipc.Client
}

func New(discord *discordipc.Client) *Connector {
	return &Connector{discord: discord}
}

func (connector *Connector) Serve(input io.Reader, output io.Writer) error {
	stop := make(chan struct{})
	defer close(stop)
	go connector.reconnectLoop(stop)

	for {
		message, err := nativeprotocol.ReadMessage(input)
		if err != nil {
			if errors.Is(err, io.EOF) || errors.Is(err, io.ErrUnexpectedEOF) {
				_ = connector.discord.ClearActivity()
				return nil
			}
			return err
		}

		request, decodeErr := nativeprotocol.DecodeRequest(message)
		if decodeErr != nil {
			if writeErr := connector.writeResponse(output, nativeprotocol.NewErrorResponse(
				nativeprotocol.ExtractID(message),
				"INVALID_MESSAGE",
				decodeErr.Error(),
			)); writeErr != nil {
				return writeErr
			}
			continue
		}

		response := connector.handle(request)
		if err := connector.writeResponse(output, response); err != nil {
			return err
		}
	}
}

func (connector *Connector) handle(request nativeprotocol.Request) nativeprotocol.Response {
	switch request.Type {
	case "ping":
		return nativeprotocol.NewOKResponse(request.ID, nativeprotocol.Pong{Pong: true})
	case "set_activity":
		activity, err := nativeprotocol.DecodeActivity(request)
		if err != nil {
			return nativeprotocol.NewErrorResponse(request.ID, "INVALID_ACTIVITY", err.Error())
		}
		if err = connector.discord.SetActivity(activity); err != nil {
			return nativeprotocol.NewErrorResponse(request.ID, "DISCORD_UNAVAILABLE", "Discord Desktop is not available.")
		}
		return nativeprotocol.NewOKResponse(request.ID, nativeprotocol.UpdatedResult{
			Updated: true,
			Status:  connector.discord.Status(),
		})
	case "clear_activity":
		if err := connector.discord.ClearActivity(); err != nil {
			return nativeprotocol.NewErrorResponse(request.ID, "DISCORD_UNAVAILABLE", "Discord Desktop is not available.")
		}
		return nativeprotocol.NewOKResponse(request.ID, nativeprotocol.ClearedResult{
			Cleared: true,
			Status:  connector.discord.Status(),
		})
	case "get_status":
		connector.discord.Probe()
		return nativeprotocol.NewOKResponse(request.ID, nativeprotocol.StatusResult{
			Status: connector.discord.Status(),
		})
	default:
		return nativeprotocol.NewErrorResponse(request.ID, "UNSUPPORTED_REQUEST", "Unsupported request type.")
	}
}

func (connector *Connector) writeResponse(output io.Writer, response nativeprotocol.Response) error {
	encoded, err := json.Marshal(response)
	if err != nil {
		return err
	}
	return nativeprotocol.WriteMessage(output, encoded)
}

func (connector *Connector) reconnectLoop(stop <-chan struct{}) {
	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			connector.discord.ReconnectIfNeeded()
		case <-stop:
			return
		}
	}
}
