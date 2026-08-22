package nativeprotocol

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/url"
	"strings"
	"unicode/utf8"
)

const (
	Version         = 1
	MaxMessageSize  = 1024 * 1024
	MaxTextLength   = 128
	MaxButtonLength = 32
)

type Request struct {
	Version  int             `json:"version"`
	ID       string          `json:"id"`
	Type     string          `json:"type"`
	Activity json.RawMessage `json:"activity,omitempty"`
}

type Activity struct {
	Type       int         `json:"type"`
	Details    string      `json:"details"`
	State      string      `json:"state,omitempty"`
	Assets     *Assets     `json:"assets,omitempty"`
	Timestamps *Timestamps `json:"timestamps,omitempty"`
	Buttons    []Button    `json:"buttons,omitempty"`
}

type Assets struct {
	LargeImage string `json:"large_image,omitempty"`
	LargeText  string `json:"large_text,omitempty"`
}

type Timestamps struct {
	Start int64 `json:"start,omitempty"`
	End   int64 `json:"end,omitempty"`
}

type Button struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}

type Status struct {
	Connector string `json:"connector"`
	Discord   string `json:"discord"`
	Activity  string `json:"activity"`
	LastError string `json:"lastError,omitempty"`
}

type Response struct {
	Version int         `json:"version"`
	ID      string      `json:"id"`
	OK      bool        `json:"ok"`
	Result  interface{} `json:"result,omitempty"`
	Error   *Error      `json:"error,omitempty"`
}

type Error struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type Pong struct {
	Pong bool `json:"pong"`
}

type StatusResult struct {
	Status Status `json:"status"`
}

type ClearedResult struct {
	Cleared bool   `json:"cleared"`
	Status  Status `json:"status"`
}

type UpdatedResult struct {
	Updated bool   `json:"updated"`
	Status  Status `json:"status"`
}

func ReadMessage(reader io.Reader) ([]byte, error) {
	var header [4]byte
	if _, err := io.ReadFull(reader, header[:]); err != nil {
		return nil, err
	}
	length := binary.LittleEndian.Uint32(header[:])
	if length > MaxMessageSize {
		return nil, fmt.Errorf("message exceeds %d bytes", MaxMessageSize)
	}
	message := make([]byte, length)
	if _, err := io.ReadFull(reader, message); err != nil {
		return nil, err
	}
	return message, nil
}

func WriteMessage(writer io.Writer, message []byte) error {
	if len(message) > MaxMessageSize {
		return fmt.Errorf("message exceeds %d bytes", MaxMessageSize)
	}
	var header [4]byte
	binary.LittleEndian.PutUint32(header[:], uint32(len(message)))
	if _, err := writer.Write(header[:]); err != nil {
		return err
	}
	_, err := writer.Write(message)
	return err
}

func DecodeRequest(message []byte) (Request, error) {
	decoder := json.NewDecoder(bytes.NewReader(message))
	decoder.DisallowUnknownFields()
	var request Request
	if err := decoder.Decode(&request); err != nil {
		return Request{}, errors.New("invalid JSON request")
	}
	var extra interface{}
	if err := decoder.Decode(&extra); err != io.EOF {
		return Request{}, errors.New("multiple JSON values")
	}
	if request.Version != Version || !validText(request.ID, MaxTextLength) {
		return Request{}, errors.New("invalid request envelope")
	}
	switch request.Type {
	case "ping", "clear_activity", "get_status":
		if len(request.Activity) != 0 {
			return Request{}, errors.New("activity is not allowed for this request")
		}
	case "set_activity":
		if len(request.Activity) == 0 {
			return Request{}, errors.New("activity is required")
		}
		var activity Activity
		activityDecoder := json.NewDecoder(bytes.NewReader(request.Activity))
		activityDecoder.DisallowUnknownFields()
		if err := activityDecoder.Decode(&activity); err != nil || !ValidateActivity(activity) {
			return Request{}, errors.New("invalid activity")
		}
	default:
		return Request{}, errors.New("unsupported request type")
	}
	return request, nil
}

func DecodeActivity(request Request) (Activity, error) {
	var activity Activity
	decoder := json.NewDecoder(bytes.NewReader(request.Activity))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&activity); err != nil || !ValidateActivity(activity) {
		return Activity{}, errors.New("invalid activity")
	}
	return activity, nil
}

func ValidateActivity(activity Activity) bool {
	if activity.Type != 2 || !validText(activity.Details, MaxTextLength) {
		return false
	}
	if activity.State != "" && !validText(activity.State, MaxTextLength) {
		return false
	}
	if activity.Assets != nil {
		if activity.Assets.LargeImage != "" && !isYouTubeImageURL(activity.Assets.LargeImage) {
			return false
		}
		if activity.Assets.LargeText != "" && !validText(activity.Assets.LargeText, MaxTextLength) {
			return false
		}
	}
	if activity.Timestamps != nil {
		if activity.Timestamps.Start < 0 || activity.Timestamps.End < 0 ||
			(activity.Timestamps.Start > 0 && activity.Timestamps.End > 0 && activity.Timestamps.End < activity.Timestamps.Start) {
			return false
		}
	}
	if len(activity.Buttons) > 1 {
		return false
	}
	for _, button := range activity.Buttons {
		if !validText(button.Label, MaxButtonLength) || !isYouTubeMusicURL(button.URL) {
			return false
		}
	}
	return true
}

func ExtractID(message []byte) string {
	var envelope struct {
		ID string `json:"id"`
	}
	if json.Unmarshal(message, &envelope) == nil && validText(envelope.ID, MaxTextLength) {
		return envelope.ID
	}
	return "invalid"
}

func NewErrorResponse(id, code, message string) Response {
	return Response{
		Version: Version,
		ID:      id,
		OK:      false,
		Error: &Error{
			Code:    code,
			Message: message,
		},
	}
}

func NewOKResponse(id string, result interface{}) Response {
	return Response{
		Version: Version,
		ID:      id,
		OK:      true,
		Result:  result,
	}
}

func validText(value string, max int) bool {
	return value != "" && utf8.ValidString(value) && utf8.RuneCountInString(value) <= max && strings.TrimSpace(value) == value
}

func isYouTubeImageURL(value string) bool {
	parsed, err := url.Parse(value)
	if err != nil || parsed.Scheme != "https" || parsed.User != nil || parsed.Hostname() == "" {
		return false
	}
	switch strings.ToLower(parsed.Hostname()) {
	case "i.ytimg.com", "img.youtube.com", "yt3.ggpht.com", "lh3.googleusercontent.com":
		return true
	default:
		return false
	}
}

func isYouTubeMusicURL(value string) bool {
	parsed, err := url.Parse(value)
	return err == nil && parsed.Scheme == "https" && parsed.Hostname() == "music.youtube.com" && parsed.Path == "/watch"
}
