package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type lineProfileResp struct {
	UserID string `json:"userId"`
}

func lineUserIDFromRequest(c *gin.Context) (string, bool) {
	authHeader := strings.TrimSpace(c.GetHeader("Authorization"))
	if authHeader == "" {
		c.String(http.StatusUnauthorized, "authorization header is required")
		return "", false
	}

	accessToken := strings.TrimSpace(authHeader)
	if strings.HasPrefix(strings.ToLower(accessToken), "bearer ") {
		accessToken = strings.TrimSpace(accessToken[7:])
	}
	if accessToken == "" {
		c.String(http.StatusUnauthorized, "bearer token is required")
		return "", false
	}

	uid, err := verifyLineAccessToken(accessToken)
	if err != nil {
		c.String(http.StatusUnauthorized, "invalid LINE access token")
		return "", false
	}
	return uid, true
}

func verifyLineAccessToken(accessToken string) (string, error) {
	req, err := http.NewRequest(http.MethodGet, "https://api.line.me/v2/profile", nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	client := &http.Client{Timeout: 5 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return "", fmt.Errorf("LINE profile returned status %d", res.StatusCode)
	}

	var profile lineProfileResp
	if err := json.NewDecoder(res.Body).Decode(&profile); err != nil {
		return "", err
	}
	profile.UserID = strings.TrimSpace(profile.UserID)
	if profile.UserID == "" {
		return "", errors.New("LINE profile missing userId")
	}
	return profile.UserID, nil
}
