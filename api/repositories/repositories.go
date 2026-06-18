package repositories

import (
	"image-processing-service/internal/models"

	"gorm.io/gorm"
)

type Repo interface {
	Signup(user models.User) (*models.User, error)
	FindByEmail(email string) (*models.User, error)
	FindByID(id string) (*models.User, error)
	CreateImage(image *models.Image) error
	GetImagesByUserID(userID string) ([]models.Image, error)
	GetImageByID(id string) (*models.Image, error)
	DeleteImage(id string, userID string) error
}

type Database struct {
	DB *gorm.DB
}

func NewRepository(db *gorm.DB) Repo {
	return &Database{
		DB: db,
	}
}

func (d *Database) Signup(user models.User) (*models.User, error) {
	if err := d.DB.Create(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (d *Database) FindByEmail(email string) (*models.User, error) {
	var user models.User
	if err := d.DB.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (d *Database) FindByID(id string) (*models.User, error) {
	var user models.User
	if err := d.DB.Where("id = ?", id).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (d *Database) CreateImage(image *models.Image) error {
	return d.DB.Create(image).Error
}

func (d *Database) GetImagesByUserID(userID string) ([]models.Image, error) {
	var images []models.Image
	if err := d.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&images).Error; err != nil {
		return nil, err
	}
	return images, nil
}

func (d *Database) GetImageByID(id string) (*models.Image, error) {
	var image models.Image
	if err := d.DB.Where("id = ?", id).First(&image).Error; err != nil {
		return nil, err
	}
	return &image, nil
}

func (d *Database) DeleteImage(id string, userID string) error {
	return d.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Image{}).Error
}