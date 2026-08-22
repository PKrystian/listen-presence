package nativeprotocol

import (
	"bytes"
	"encoding/json"
	"testing"
)

func TestNativeMessageFraming(t *testing.T) {
	message := []byte(`{"version":1,"id":"one","type":"ping"}`)
	var buffer bytes.Buffer
	if err := WriteMessage(&buffer, message); err != nil {
		t.Fatal(err)
	}
	decoded, err := ReadMessage(&buffer)
	if err != nil {
		t.Fatal(err)
	}
	if string(decoded) != string(message) {
		t.Fatalf("decoded %q, want %q", decoded, message)
	}
}

func TestDecodeRequestRejectsUnknownCommand(t *testing.T) {
	_, err := DecodeRequest([]byte(`{"version":1,"id":"one","type":"execute","command":"whoami"}`))
	if err == nil {
		t.Fatal("expected unknown command to be rejected")
	}
}

func TestDecodeRequestAcceptsListeningActivity(t *testing.T) {
	message, err := json.Marshal(map[string]interface{}{
		"version": 1,
		"id":      "one",
		"type":    "set_activity",
		"activity": Activity{
			Type:    2,
			Details: "Song",
			Assets:  &Assets{LargeImage: "https://i.ytimg.com/vi/id/hqdefault.jpg"},
			Buttons: []Button{{Label: "Open in YouTube Music", URL: "https://music.youtube.com/watch?v=id"}},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	request, err := DecodeRequest(message)
	if err != nil {
		t.Fatal(err)
	}
	if request.Type != "set_activity" {
		t.Fatalf("request type %q", request.Type)
	}
}

func TestDecodeRequestRejectsArbitraryImageURL(t *testing.T) {
	message := []byte(`{"version":1,"id":"one","type":"set_activity","activity":{"type":2,"details":"Song","assets":{"large_image":"https://example.test/image.jpg"}}}`)
	_, err := DecodeRequest(message)
	if err == nil {
		t.Fatal("expected arbitrary image URL to be rejected")
	}
}
