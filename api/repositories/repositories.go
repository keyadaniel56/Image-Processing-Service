package repositories

import (
	"image-processing-service/internal/database"
	"image-processing-service/internal/models"

	"gorm.io/gorm"
)





type Repo interface{
	Signup(models.User)(*models.User,error)
	FindByEmail(email string)(*models.User,error)
}



type Database struct{
	DB *gorm.DB
}


func NewRepository(db *gorm.DB)Repo{
	return &Database{
		DB: db,
	}
}

func (d *Database) Signup(user models.User)(*models.User,error){
	if err:=database.DB.Create(&user);err!=nil{
		return nil,err.Error
	}
	return &user,nil
}



func (d *Database) FindByEmail(email string)(*models.User,error){
	var user models.User
	if err:=d.DB.Where("email=?",email).First(&user).Error;err!=nil{
		return nil,err
	}
	return &user,nil
}