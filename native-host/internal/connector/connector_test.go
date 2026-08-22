package connector

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"testing"

	"github.com/PKrystian/listen-presence/native-host/internal/discordipc"
	"github.com/PKrystian/listen-presence/native-host/internal/nativeprotocol"
)

func TestServeRespondsToPing(t *testing.T) {
	input := frame([]byte(`{"version":1,"id":"one","type":"ping"}`))
	var output bytes.Buffer
	connector := New(discordipc.New("000000000000000000"))
	if err := connector.Serve(bytes.NewReader(input), &output); err != nil {
		t.Fatal(err)
	}
	responseBytes, err := nativeprotocol.ReadMessage(&output)
	if err != nil {
		t.Fatal(err)
	}
	var response nativeprotocol.Response
	if err := json.Unmarshal(responseBytes, &response); err != nil {
		t.Fatal(err)
	}
	if !response.OK || response.ID != "one" {
		t.Fatalf("unexpected response: %+v", response)
	}
}

func frame(message []byte) []byte {
	var output bytes.Buffer
	var header [4]byte
	binary.LittleEndian.PutUint32(header[:], uint32(len(message)))
	output.Write(header[:])
	output.Write(message)
	return output.Bytes()
}
