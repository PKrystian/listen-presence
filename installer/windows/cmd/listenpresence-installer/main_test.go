//go:build windows

package main

import "testing"

func TestValidExtensionID(t *testing.T) {
	if !validExtensionID("abcdefghijklmnopabcdefghijklmnop") {
		t.Fatal("expected a valid extension ID")
	}
	if validExtensionID("not-an-extension-id") {
		t.Fatal("expected an invalid extension ID")
	}
}

func TestValidApplicationID(t *testing.T) {
	if !validApplicationID("123456789012345678") {
		t.Fatal("expected a valid application ID")
	}
	if validApplicationID("application-id") {
		t.Fatal("expected an invalid application ID")
	}
}
