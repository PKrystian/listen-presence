//go:build !windows

package discordipc

import (
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"path/filepath"
	"time"
)

const unixSocketTimeout = 500 * time.Millisecond

func openPipe(index int) (io.ReadWriteCloser, error) {
	var failures []error
	for _, socketPath := range discordSocketPaths(index) {
		connection, err := net.DialTimeout("unix", socketPath, unixSocketTimeout)
		if err == nil {
			return connection, nil
		}
		failures = append(failures, err)
	}
	return nil, errors.Join(failures...)
}

func discordSocketPaths(index int) []string {
	name := fmt.Sprintf("discord-ipc-%d", index)
	directories := []string{
		os.Getenv("XDG_RUNTIME_DIR"),
		os.Getenv("TMPDIR"),
		os.Getenv("TMP"),
		os.Getenv("TEMP"),
		"/tmp",
	}
	seen := make(map[string]struct{}, len(directories))
	paths := make([]string, 0, len(directories)+1)
	for _, directory := range directories {
		if directory == "" {
			continue
		}
		path := filepath.Join(directory, name)
		if _, exists := seen[path]; exists {
			continue
		}
		seen[path] = struct{}{}
		paths = append(paths, path)
	}
	if runtimeDirectory := os.Getenv("XDG_RUNTIME_DIR"); runtimeDirectory != "" {
		flatpakPath := filepath.Join(runtimeDirectory, "app", "com.discordapp.Discord", name)
		if _, exists := seen[flatpakPath]; !exists {
			paths = append(paths, flatpakPath)
		}
	}
	return paths
}
