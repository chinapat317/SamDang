package botbackend

import (
	"fmt"
	"log"
	"strings"
)

func GetCode(text string, length int) (string, bool, error) {
	text = strings.TrimSpace(text)
	if length <= 0 {
		return "", false, fmt.Errorf("Code not found in message")
	}
	chars := []rune(text)
	if len(chars) <= length {
		return string(chars), false, fmt.Errorf("Code too short: text='%s' length=%d", text, length)
	}
	code := string(chars[len(chars)-length:])
	log.Printf("GetCode: extracted code '%s' from text '%s'\n", code, text)
	return code, true, nil
}
