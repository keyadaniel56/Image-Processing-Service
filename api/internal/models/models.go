package models

type User struct {
	ID string `json:"id"`
	UserName string `json:"username"`
	Email string `json:"email"`
	Password string `json:"-"`
}
