//go:build windows

package discordipc

import (
	"fmt"
	"io"
	"os"
)

func openPipe(index int) (io.ReadWriteCloser, error) {
	return os.OpenFile(fmt.Sprintf(`\\?\pipe\discord-ipc-%d`, index), os.O_RDWR, 0)
}
