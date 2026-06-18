package models

import "time"

type User struct {
	ID        string    `json:"id" gorm:"primaryKey;type:text"`
	UserName  string    `json:"username" gorm:"uniqueIndex;not null"`
	Email     string    `json:"email" gorm:"uniqueIndex;not null"`
	Password  string    `json:"-" gorm:"not null"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Image struct {
	ID        string    `json:"id" gorm:"primaryKey;type:text"`
	UserID    string    `json:"user_id" gorm:"index;not null"`
	FileName  string    `json:"file_name" gorm:"not null"`
	FilePath  string    `json:"file_path" gorm:"not null"`
	FileSize  int64     `json:"file_size"`
	MimeType  string    `json:"mime_type"`
	Width     int       `json:"width"`
	Height    int       `json:"height"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}