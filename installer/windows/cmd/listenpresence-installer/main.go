//go:build windows

package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"unicode"
	"unsafe"
)

const (
	nativeHostName = "com.listenpresence.connector"
	installDirName = "ListenPresence"
	connectorName  = "listenpresence-connector.exe"
	messageOK      = 0x00000000
	messageError   = 0x00000010
	messageInfo    = 0x00000040
)

var (
	publishedExtensionID = ""
	discordApplicationID = ""
	user32               = syscall.NewLazyDLL("user32.dll")
	messageBox           = user32.NewProc("MessageBoxW")
)

type hostManifest struct {
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	Path          string   `json:"path"`
	Type          string   `json:"type"`
	AllowedOrigin []string `json:"allowed_origins"`
}

type connectorConfig struct {
	DiscordApplicationID string `json:"discordApplicationId"`
}

func main() {
	if isUninstallRequest() {
		if err := uninstall(); err != nil {
			showMessage("ListenPresence", err.Error(), messageError)
			os.Exit(1)
		}
		showMessage("ListenPresence", "ListenPresence has been removed.", messageInfo)
		return
	}

	if err := install(); err != nil {
		showMessage("ListenPresence installation failed", err.Error(), messageError)
		os.Exit(1)
	}
	showMessage(
		"ListenPresence is ready",
		"Installation complete.\n\n"+
			"1. Keep Discord Desktop running.\n"+
			"2. Open YouTube Music.\n"+
			"3. Play a song.\n\n"+
			"The connector starts automatically when ListenPresence needs it.\n"+
			"No Discord login, token, or additional ID is required.",
		messageOK,
	)
}

func install() error {
	if len(connectorAsset) == 0 {
		return errors.New("This setup build does not contain the connector binary.")
	}
	if !validExtensionID(publishedExtensionID) {
		return errors.New("This setup build has no valid published extension ID.")
	}
	if !validApplicationID(discordApplicationID) {
		return errors.New("This setup build has no valid Discord application ID.")
	}

	installRoot, err := localInstallRoot()
	if err != nil {
		return err
	}
	if err = os.MkdirAll(installRoot, 0o700); err != nil {
		return fmt.Errorf("could not create the per-user install directory: %w", err)
	}

	connectorPath := filepath.Join(installRoot, connectorName)
	manifestPath := filepath.Join(installRoot, nativeHostName+".json")
	configPath := filepath.Join(installRoot, "config.json")
	if err = writeFileAtomically(connectorPath, connectorAsset, 0o700); err != nil {
		return fmt.Errorf("could not install the connector. Close Chrome and Brave, then try again: %w", err)
	}

	manifest := hostManifest{
		Name:          nativeHostName,
		Description:   "ListenPresence local Discord Rich Presence connector",
		Path:          connectorPath,
		Type:          "stdio",
		AllowedOrigin: []string{"chrome-extension://" + publishedExtensionID + "/"},
	}
	if err = writeJSONAtomically(manifestPath, manifest); err != nil {
		return fmt.Errorf("could not write the browser connector manifest: %w", err)
	}

	config := connectorConfig{DiscordApplicationID: discordApplicationID}
	if err = writeJSONAtomically(configPath, config); err != nil {
		return fmt.Errorf("could not write the connector configuration: %w", err)
	}

	for _, browser := range []string{"Chrome", "Brave"} {
		if err = registerHost(browser, manifestPath); err != nil {
			return err
		}
	}
	return nil
}

func uninstall() error {
	for _, browser := range []string{"Chrome", "Brave"} {
		if err := removeHost(browser); err != nil {
			return err
		}
	}
	installRoot, err := localInstallRoot()
	if err != nil {
		return err
	}
	if err = os.RemoveAll(installRoot); err != nil {
		return fmt.Errorf("could not remove the per-user install directory: %w", err)
	}
	return nil
}

func registerHost(browser, manifestPath string) error {
	registryKeys, err := registryKeys(browser)
	if err != nil {
		return err
	}
	for _, registryKey := range registryKeys {
		if err = runRegistry("ADD", registryKey, "/ve", "/t", "REG_SZ", "/d", manifestPath, "/f"); err != nil {
			return fmt.Errorf("could not register Native Messaging for %s: %w", browser, err)
		}
	}
	return nil
}

func removeHost(browser string) error {
	registryKeys, err := registryKeys(browser)
	if err != nil {
		return err
	}
	for _, registryKey := range registryKeys {
		if err = runRegistry("DELETE", registryKey, "/f"); err != nil {
			if queryErr := runRegistry("QUERY", registryKey); queryErr == nil {
				return fmt.Errorf("could not remove Native Messaging registration for %s: %w", browser, err)
			}
		}
	}
	return nil
}

func runRegistry(arguments ...string) error {
	return exec.Command("reg.exe", arguments...).Run()
}

func registryKeys(browser string) ([]string, error) {
	switch browser {
	case "Chrome":
		return []string{`HKCU\Software\Google\Chrome\NativeMessagingHosts\` + nativeHostName}, nil
	case "Brave":
		return []string{
			`HKCU\Software\Google\Chrome\NativeMessagingHosts\` + nativeHostName,
			`HKCU\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\` + nativeHostName,
		}, nil
	default:
		return nil, fmt.Errorf("unsupported browser: %s", browser)
	}
}

func localInstallRoot() (string, error) {
	localAppData := strings.TrimSpace(os.Getenv("LOCALAPPDATA"))
	if localAppData == "" {
		return "", errors.New("Windows LOCALAPPDATA is not available.")
	}
	return filepath.Join(localAppData, installDirName), nil
}

func writeJSONAtomically(path string, value interface{}) error {
	encoded, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	return writeFileAtomically(path, append(encoded, '\n'), 0o600)
}

func writeFileAtomically(path string, data []byte, mode os.FileMode) error {
	temporary := path + ".new"
	if err := os.WriteFile(temporary, data, mode); err != nil {
		return err
	}
	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		_ = os.Remove(temporary)
		return err
	}
	if err := os.Rename(temporary, path); err != nil {
		_ = os.Remove(temporary)
		return err
	}
	return nil
}

func isUninstallRequest() bool {
	for _, argument := range os.Args[1:] {
		if strings.EqualFold(argument, "/uninstall") || strings.EqualFold(argument, "--uninstall") {
			return true
		}
	}
	return false
}

func validExtensionID(value string) bool {
	if len(value) != 32 {
		return false
	}
	for _, character := range value {
		if character < 'a' || character > 'p' {
			return false
		}
	}
	return true
}

func validApplicationID(value string) bool {
	if len(value) < 17 || len(value) > 20 {
		return false
	}
	for _, character := range value {
		if !unicode.IsDigit(character) {
			return false
		}
	}
	return true
}

func showMessage(title, message string, flags uintptr) {
	titlePointer, _ := syscall.UTF16PtrFromString(title)
	messagePointer, _ := syscall.UTF16PtrFromString(message)
	_, _, _ = messageBox.Call(
		0,
		uintptr(unsafe.Pointer(messagePointer)),
		uintptr(unsafe.Pointer(titlePointer)),
		flags,
	)
}
