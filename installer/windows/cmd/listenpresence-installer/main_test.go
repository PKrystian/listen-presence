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

func TestRegistryKeysForBrave(t *testing.T) {
	keys, err := registryKeys("Brave")
	if err != nil {
		t.Fatal(err)
	}
	if len(keys) != 2 {
		t.Fatalf("expected two Brave registry keys, got %d", len(keys))
	}
	if keys[0] != `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.listenpresence.connector` {
		t.Fatalf("unexpected Chrome-compatible key: %s", keys[0])
	}
	if keys[1] != `HKCU\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.listenpresence.connector` {
		t.Fatalf("unexpected Brave key: %s", keys[1])
	}
}

func TestRegistryKeysForChromium(t *testing.T) {
	keys, err := registryKeys("Chromium")
	if err != nil {
		t.Fatal(err)
	}
	if len(keys) != 1 {
		t.Fatalf("expected one Chromium registry key, got %d", len(keys))
	}
	if keys[0] != `HKCU\Software\Chromium\NativeMessagingHosts\com.listenpresence.connector` {
		t.Fatalf("unexpected Chromium key: %s", keys[0])
	}
}
