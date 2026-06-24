package botbackend

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strings"

	dbmanage "github.com/chinapat317/SamDang/db-manage"
	"github.com/gin-gonic/gin"
	"github.com/line/line-bot-sdk-go/v7/linebot"
)

func GetGroupSummary(groupId string, bot *linebot.Client) (string, error) {
	summary, err := bot.GetGroupSummary(groupId).Do()
	if err != nil {
		return "", err
	}
	return summary.GroupName, nil
}

func VerifySig(c *gin.Context, bot *linebot.Client) []*linebot.Event {
	events, err := bot.ParseRequest(c.Request) // verifies X-Line-Signature + parses JSON
	if err != nil {
		if err == linebot.ErrInvalidSignature {
			c.String(http.StatusBadRequest, "invalid signature")
		} else {
			c.String(http.StatusBadRequest, "bad request")
		}
		events = nil
	}
	return events
}

func EventController(events []*linebot.Event,
	bot *linebot.Client,
	db *sql.DB,
	db_hmac string) {
	for _, event := range events {
		if event.Type == linebot.EventTypeLeave {
			BotLeaveGroup(event, db)
			return
		}
		if event.Type == linebot.EventTypeMessage {
			msg, ok := event.Message.(*linebot.TextMessage)
			if ok {
				if event.Source.Type == linebot.EventSourceTypeGroup {
					log.Printf("LINE webhook group id: %s", event.Source.GroupID)
					if msg.Text == "@SamDang เพิ่มฉัน" {
						AddGroupMember(event, db, bot, db_hmac)
						return
					}
					if msg.Text == "@SamDang ลงทะเบียนกลุ่ม" {
						RegisterGroup(event, db, bot)
						return
					}
					if msg.Text == "@SamDang งานที่ดำเนินการในกลุ่ม" {
						ListGroupInProgressTasks(event, db, bot)
						return
					}
				} else if strings.HasPrefix(strings.TrimSpace(msg.Text), "@SamDang เพิ่ม admin") {
					AddRole(event, db, bot, db_hmac, "admin", "addAdmin")
					return
				} else if strings.HasPrefix(strings.TrimSpace(msg.Text), "@SamDang เพิ่ม manager") {
					AddRole(event, db, bot, db_hmac, "manager", "addManager")
					return
				} else {
					err_mes := fmt.Sprintf("ผู้ใช้ไม่ได้อยู่ในกลุ่มไลน์ กรุณากดลงทะเบียนเฉพาะตอนอยู่ในกลุ่มไลน์", event.Source.UserID)
					_, _ = bot.ReplyMessage(
						event.ReplyToken,
						linebot.NewTextMessage(err_mes),
					).Do()
				}
			}
		} else {
			log.Printf("LINE event type: %s\n", event.Type)
		}
	}
}

func BotLeaveGroup(event *linebot.Event,
	db *sql.DB) {
	if event.Source.Type == linebot.EventSourceTypeGroup {
		dbmanage.GroupLeave(db, event.Source.GroupID)
	} else {
		log.Printf("Leave event: source is nil\n")
	}
}

func RegisterGroup(event *linebot.Event,
	db *sql.DB,
	bot *linebot.Client) {
	_, err := dbmanage.CheckUserRole(event.Source.UserID, db, []string{"manager", "admin"})
	if err != nil {
		err_mes := fmt.Sprintf("ผู้ใช้@%sไม่มีสิทธิ์ลงทะเบียนกลุ่ม กรุณาให้ project manager เป็นคนกดลงทะเบียนกลุ่ม หรือติดต่อ admin ของบริษัท", event.Source.UserID)
		_, _ = bot.ReplyMessage(
			event.ReplyToken,
			linebot.NewTextMessage(err_mes),
		).Do()
		return
	}
	gname, err := GetGroupSummary(event.Source.GroupID, bot)
	if err != nil {
		log.Printf("GetGroupSummary error: %s", err)
		err_mes := fmt.Sprintf("ไม่สามารถค้นหากลุ่มด้วยไลน์ api ได้ กรุณาลองอีกครั้งหรือแจ้งผู้พัฒนา")
		_, _ = bot.ReplyMessage(
			event.ReplyToken,
			linebot.NewTextMessage(err_mes),
		).Do()
		return
	}
	err = dbmanage.GroupRegister(db, event.Source.GroupID, gname)
	if err != nil {
		log.Printf("GroupRegister error: %s", err)
		err_mes := fmt.Sprintf("ไม่สามารถลงทะเบียนกลุ่มได้ เนื่องจาก group sql errorกรุณาลองอีกครั้งหรือแจ้งผู้พัฒนา", event.Source.UserID)
		_, _ = bot.ReplyMessage(
			event.ReplyToken,
			linebot.NewTextMessage(err_mes),
		).Do()
		return
	}
	log.Printf("GroupRegister successfully")
	msg := fmt.Sprintf("ลงทะเบียนกลุ่มเรียบร้อยค่ะ คุณสามารถใช้คำสั่งต่างๆของ Samdang ได้แล้วค่ะ")
	_, _ = bot.ReplyMessage(
		event.ReplyToken,
		linebot.NewTextMessage(msg),
	).Do()
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
	prof, err := bot.GetProfile(uid).Do()
	if err != nil {
		log.Printf("GetProfile error: %s", err)
		err_mes := fmt.Sprintf("ไม่สามารถค้นหาข้อมูลผู้ใช้ด้วยไลน์ api ได้ กรุณาลองอีกครั้งหรือแจ้งผู้พัฒนา")
		_, _ = bot.ReplyMessage(
			event.ReplyToken,
			linebot.NewTextMessage(err_mes),
		).Do()
		return
	}
	name = prof.DisplayName
	pic = prof.PictureURL
	err = dbmanage.AddUser(db, uid, name, pic, db_hmac)
	if err != nil {
		log.Printf("AddUser error: %s", err)
		err_mes := fmt.Sprintf("ไม่สามารถเพิ่มผู้ใช้ในระบบได้ เนื่องจาก sql error กรุณาลองอีกครั้งหรือแจ้งผู้พัฒนา", event.Source.UserID)
		_, _ = bot.ReplyMessage(
			event.ReplyToken,
			linebot.NewTextMessage(err_mes),
		).Do()
		return
	}
	err = dbmanage.AddMemberToGroup(db, uid, gid)
	if err != nil {
		log.Println("AddMemberToGroup error:", err)
		err_mes := fmt.Sprintf("คุณ%s มีชื่อในกลุ่มแล้วค่ะ", name)
		_, _ = bot.ReplyMessage(
			event.ReplyToken,
			linebot.NewTextMessage(err_mes),
		).Do()
	}
	log.Printf("regis successfully")
	msg := fmt.Sprintf("เพิ่มคุณ@%sลงในกลุ่มเรียบร้อยค่ะ", name)
	_, _ = bot.ReplyMessage(
		event.ReplyToken,
		linebot.NewTextMessage(msg),
	).Do()
}

func AddRole(event *linebot.Event,
	db *sql.DB,
	bot *linebot.Client,
	db_hmac string,
	role string,
	codeName string) {
	msg, ok := event.Message.(*linebot.TextMessage)
	uid := event.Source.UserID
	code, has_code, _ := GetCode(msg.Text, 8)
	if !has_code {
		_, _ = bot.ReplyMessage(
			event.ReplyToken,
			linebot.NewTextMessage(fmt.Sprintf("ไม่พบ %s code ในข้อความ กรุณาพิมพ์คำสั่งในรูปแบบ\n'@Samdang เพิ่ม %s <%s code>", role, role, role)),
		).Do()
		return
	}
	ok, err := dbmanage.CheckCode(db, codeName, code)
	if err != nil {
		log.Printf("CheckCode error: %s", err)
		_, _ = bot.ReplyMessage(
			event.ReplyToken,
			linebot.NewTextMessage(fmt.Sprintf("ไม่สามารถตรวจสอบ %s code ได้ กรุณาลองอีกครั้ง", role)),
		).Do()
		return
	}
	if !ok {
		_, _ = bot.ReplyMessage(
			event.ReplyToken,
			linebot.NewTextMessage(fmt.Sprintf("%s code ไม่ถูกต้อง", role)),
		).Do()
		return
	}
	prof, err := bot.GetProfile(uid).Do()
	if err != nil {
		log.Printf("GetProfile error: %s", err)
		err_mes := fmt.Sprintf("ไม่สามารถค้นหาข้อมูลผู้ใช้ด้วยไลน์ api ได้ กรุณาลองอีกครั้งหรือแจ้งผู้พัฒนา")
		_, _ = bot.ReplyMessage(
			event.ReplyToken,
			linebot.NewTextMessage(err_mes),
		).Do()
		return
	}
	displayName := prof.DisplayName
	pic := prof.PictureURL
	if err := dbmanage.AddUser(db, uid, displayName, pic, db_hmac); err != nil {
		log.Printf("AddUser error: %s", err)
		_, _ = bot.ReplyMessage(
			event.ReplyToken,
			linebot.NewTextMessage("ไม่สามารถเพิ่มผู้ใช้ในระบบได้ เนื่องจาก sql error กรุณาลองอีกครั้งหรือแจ้งผู้พัฒนา"),
		).Do()
		return
	}
	if err := dbmanage.UpdateUserRole(db, uid, role); err != nil {
		log.Printf("UpdateUserRole error: %s", err)
		_, _ = bot.ReplyMessage(
			event.ReplyToken,
			linebot.NewTextMessage(fmt.Sprintf("ไม่สามารถเพิ่มสิทธิ์ %s ได้ กรุณาลองอีกครั้ง", role)),
		).Do()
		return
	}
	_, _ = bot.ReplyMessage(
		event.ReplyToken,
		linebot.NewTextMessage(fmt.Sprintf("เพิ่มสิทธิ์ %s เรียบร้อยค่ะ", role)),
	).Do()
	dbmanage.ChangeCode(codeName, 8, db)
}

func ListGroupInProgressTasks(event *linebot.Event, db *sql.DB, bot *linebot.Client) {
	groupId := event.Source.GroupID
	response, err := BuildGroupInProgressTaskMessage(db, groupId)
	if err != nil {
		log.Printf("BuildGroupInProgressTaskMessage error: %s", err)
		_, _ = bot.ReplyMessage(
			event.ReplyToken,
			linebot.NewTextMessage("ไม่สามารถดึงงานในกลุ่มได้ กรุณาลองอีกครั้งหรือแจ้งผู้พัฒนา"),
		).Do()
		return
	}
	if false {
		_, _ = bot.ReplyMessage(
			event.ReplyToken,
			linebot.NewTextMessage("ยังไม่มีงานในกลุ่มนี้ค่ะ"),
		).Do()
		return
	}
	_, _ = bot.ReplyMessage(
		event.ReplyToken,
		linebot.NewTextMessage(response),
	).Do()
}

func SendDailyGroupInProgressTasks(db *sql.DB, bot *linebot.Client) {
	groups, err := dbmanage.GetJoinedGroups(db)
	if err != nil {
		log.Printf("GetJoinedGroups error: %s", err)
		return
	}
	log.Printf("Sending daily group task lists to %d groups", groups)
	for _, group := range groups {
		message, err := BuildGroupInProgressTaskMessage(db, group.LineGroupID)
		if err != nil {
			log.Printf("BuildGroupTaskMessage error for group %s: %s", group.LineGroupID, err)
			continue
		}
		if _, err := bot.PushMessage(
			group.LineGroupID,
			linebot.NewTextMessage(message),
		).Do(); err != nil {
			log.Printf("Push daily task list error for group %s: %s", group.LineGroupID, err)
		}
	}
}
