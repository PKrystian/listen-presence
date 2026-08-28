package discordipc

import (
	"bytes"
	"io"
	"testing"
)

type memoryConnection struct {
	input  *bytes.Reader
	output bytes.Buffer
}

func (connection *memoryConnection) Read(data []byte) (int, error) {
	return connection.input.Read(data)
}

func (connection *memoryConnection) Write(data []byte) (int, error) {
	return connection.output.Write(data)
}

func (connection *memoryConnection) Close() error {
	return nil
}

type oneByteWriter struct {
	output bytes.Buffer
}

func (writer *oneByteWriter) Write(data []byte) (int, error) {
	if len(data) == 0 {
		return 0, nil
	}
	return writer.output.Write(data[:1])
}

func TestReadRPCPacketRespondsToPing(t *testing.T) {
	var input bytes.Buffer
	if err := writePacket(&input, opcodePing, []byte(`{"nonce":"one"}`)); err != nil {
		t.Fatal(err)
	}
	if err := writePacket(&input, opcodeFrame, []byte(`{"cmd":"SET_ACTIVITY"}`)); err != nil {
		t.Fatal(err)
	}
	connection := &memoryConnection{input: bytes.NewReader(input.Bytes())}
	packet, err := readRPCPacket(connection)
	if err != nil {
		t.Fatal(err)
	}
	if packet.Opcode != opcodeFrame {
		t.Fatalf("opcode = %d, want %d", packet.Opcode, opcodeFrame)
	}
	pong, err := readPacket(&connection.output)
	if err != nil {
		t.Fatal(err)
	}
	if pong.Opcode != opcodePong || string(pong.Payload) != `{"nonce":"one"}` {
		t.Fatalf("unexpected pong: %+v", pong)
	}
}

func TestWritePacketCompletesShortWrites(t *testing.T) {
	writer := &oneByteWriter{}
	if err := writePacket(writer, opcodeFrame, []byte("payload")); err != nil {
		t.Fatal(err)
	}
	packet, err := readPacket(bytes.NewReader(writer.output.Bytes()))
	if err != nil {
		t.Fatal(err)
	}
	if packet.Opcode != opcodeFrame || string(packet.Payload) != "payload" {
		t.Fatalf("unexpected packet: %+v", packet)
	}
}

func TestWriteAllRejectsNoProgress(t *testing.T) {
	err := writeAll(zeroWriter{}, []byte("payload"))
	if err != io.ErrShortWrite {
		t.Fatalf("writeAll() error = %v, want %v", err, io.ErrShortWrite)
	}
}

type zeroWriter struct{}

func (zeroWriter) Write([]byte) (int, error) {
	return 0, nil
}
