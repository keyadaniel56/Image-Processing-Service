package database

import (
	"fmt"
	"image-processing-service/internal/models"
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var (
	DB  *gorm.DB
	err error
)

func InititializeDatabase() {
	DB, err = gorm.Open(sqlite.Open("image.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("database initialization failed", err)
	} else {
		DB.AutoMigrate(models.User{})
	}
	fmt.Println("connection successfully ")

}
