//go:build !windows

package discordipc

import (
	"path/filepath"
	"testing"
)

func TestDiscordSocketPathsFollowDiscordOrder(t *testing.T) {
	t.Setenv("XDG_RUNTIME_DIR", "/run/listenpresence")
	t.Setenv("TMPDIR", "/private/tmp/listenpresence")
	t.Setenv("TMP", "/tmp/listenpresence")
	t.Setenv("TEMP", "")

	paths := discordSocketPaths(3)
	want := []string{
		filepath.Join("/run/listenpresence", "discord-ipc-3"),
		filepath.Join("/private/tmp/listenpresence", "discord-ipc-3"),
		filepath.Join("/tmp/listenpresence", "discord-ipc-3"),
		filepath.Join("/tmp", "discord-ipc-3"),
		filepath.Join("/run/listenpresence", "app", "com.discordapp.Discord", "discord-ipc-3"),
	}
	if len(paths) != len(want) {
		t.Fatalf("discordSocketPaths() returned %d paths, want %d: %v", len(paths), len(want), paths)
	}
	for index := range want {
		if paths[index] != want[index] {
			t.Fatalf("discordSocketPaths()[%d] = %q, want %q", index, paths[index], want[index])
		}
	}
}

func TestDiscordSocketPathsRemoveDuplicates(t *testing.T) {
	t.Setenv("XDG_RUNTIME_DIR", "/tmp")
	t.Setenv("TMPDIR", "/tmp")
	t.Setenv("TMP", "")
	t.Setenv("TEMP", "")

	paths := discordSocketPaths(0)
	if len(paths) != 2 {
		t.Fatalf("discordSocketPaths() returned %v", paths)
	}
}
