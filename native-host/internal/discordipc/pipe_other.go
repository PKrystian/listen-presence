//go:build !windows

package discordipc

import (
	"errors"
	"os"
)

func openPipe(_ int) (*os.File, error) {
	return nil, errors.New("this connector build currently supports Windows only")
}
