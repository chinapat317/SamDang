package botbackend

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"

	dbmanage "github.com/chinapat317/SamDang/db-manage"
	"github.com/line/line-bot-sdk-go/v7/linebot"
)

func GetGroupSummary(groupId string, channelToken string) (string, error) {
	url := "https://api.line.me/v2/bot/group/" + groupId + "/summary"
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+channelToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode/100 != 2 {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("line api error %s: %s", resp.Status, string(b))
	}

	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return "", err
	}

	return data.GroupName, nil
}

func VerifySig(r *http.Request, w http.ResponseWriter, bot *linebot.Client) []*linebot.Event {
	events, err := bot.ParseRequest(r) // verifies X-Line-Signature + parses JSON
	if err != nil {
		if err == linebot.ErrInvalidSignature {
			http.Error(w, "invalid signature", http.StatusBadRequest)
		} else {
			http.Error(w, "bad request", http.StatusBadRequest)
		}
		events = nil
	}
	return events
}

func EventController(events []*linebot.Event,
	bot *linebot.Client,
	db *sql.DB,
	db_hmac string,
	token string) {
	for _, event := range events {
		if event.Type == linebot.EventTypeJoin {
			BotJoinGroup(event, db, token)
		} else if event.Type == linebot.EventTypeLeave {
			BotLeaveGroup(event, db)
		} else if event.Type == linebot.EventTypeMessage {
			msg, ok := event.Message.(*linebot.TextMessage)
			if ok {
				if msg.Text == "@Samdang เพิ่มฉัน" {
					AddGroupMember(event, db, bot, db_hmac)
				}

			}
		} else {
			log.Printf("LINE event type: %s\n", event.Type)
		}
	}
}

func BotJoinGroup(event *linebot.Event,
	db *sql.DB,
	token string) {
	if event.Source != nil {
		if event.Source.Type == linebot.EventSourceTypeGroup {
			gname, _ := GetGroupSummary(event.Source.GroupID, token)
			dbmanage.GroupJoined(db, event.Source.GroupID, gname)
		}
	} else {
		log.Printf("JOIN event: source is nil\n")
	}
	return
}

func BotLeaveGroup(event *linebot.Event,
	db *sql.DB) {
	if event.Source != nil {
		if event.Source.Type == linebot.EventSourceTypeGroup {
			dbmanage.GroupLeave(db, event.Source.GroupID)
		}
	} else {
		log.Printf("JOIN event: source is nil\n")
	}
	return
}

func AddGroupMember(event *linebot.Event,
	db *sql.DB,
	bot *linebot.Client,
	db_hmac string) {
	var (
		name string
		pic  string
	)
	uid := event.Source.UserID
	gid := event.Source.GroupID
	prof, err := bot.GetGroupMemberProfile(gid, uid).Do()
	if err != nil {
		log.Printf("GetGroupMemberProfile error: %s", err)
	} else {
		name = prof.DisplayName
		pic = prof.PictureURL
		err = dbmanage.AddUser(db, uid, name, pic, db_hmac)
		if err != nil {
			log.Printf("GetGroupMemberProfile error: %s", err)
		} else {
			err = dbmanage.AddMemberToGroup(db, uid, gid)
			if err != nil {
				log.Println("AddMemberToGroup error:", err)
				err_mes := fmt.Sprintf("เพิ่ม@%sไม่สำเร็จ กรุณาลองอีกครั้งหรือแจ้งผู้พัฒนา", event.Source.UserID)
				_, _ = bot.ReplyMessage(
					event.ReplyToken,
					linebot.NewTextMessage(err_mes),
				).Do()
			} else {
				log.Printf("regis successfully")
				msg := fmt.Sprintf("เพิ่มคุณ@%sลงในกลุ่มเรียบร้อยค่ะ", name)
				_, _ = bot.ReplyMessage(
					event.ReplyToken,
					linebot.NewTextMessage(msg),
				).Do()
			}
		}
	}
	return
}
