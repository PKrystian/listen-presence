//go:build windows

package discordipc

import (
	"fmt"
	"os"
)

func openPipe(index int) (*os.File, error) {
	return os.OpenFile(fmt.Sprintf(`\\?\pipe\discord-ipc-%d`, index), os.O_RDWR, 0)
}
