package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/PKrystian/listen-presence/native-host/internal/connector"
	"github.com/PKrystian/listen-presence/native-host/internal/discordipc"
)

type config struct {
	DiscordApplicationID string `json:"discordApplicationId"`
}

func main() {
	if len(os.Args) > 1 && !validOrigin(os.Args[1]) {
		_, _ = fmt.Fprintln(os.Stderr, "ListenPresence connector rejected the caller origin")
		return
	}

	applicationID := loadApplicationID()
	client := discordipc.New(applicationID)
	host := connector.New(client)
	if err := host.Serve(os.Stdin, os.Stdout); err != nil {
		_, _ = fmt.Fprintln(os.Stderr, "ListenPresence connector stopped:", err)
	}
}

func loadApplicationID() string {
	if value := strings.TrimSpace(os.Getenv("LISTENPRESENCE_DISCORD_APPLICATION_ID")); value != "" {
		return value
	}
	executable, err := os.Executable()
	if err != nil {
		return ""
	}
	configPath := filepath.Join(filepath.Dir(executable), "config.json")
	contents, err := os.ReadFile(configPath)
	if err != nil {
		return ""
	}
	var settings config
	if json.Unmarshal(contents, &settings) != nil {
		return ""
	}
	return strings.TrimSpace(settings.DiscordApplicationID)
}

func validOrigin(origin string) bool {
	return strings.HasPrefix(origin, "chrome-extension://") &&
		strings.HasSuffix(origin, "/") &&
		!strings.Contains(origin, "..") &&
		!strings.ContainsAny(origin, "\\\r\n") &&
		len(origin) <= 256
}
