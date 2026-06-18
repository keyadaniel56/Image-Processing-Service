package services

import (
	"errors"
	"fmt"
	"image-processing-service/internal/models"
	"image-processing-service/repositories"
	"io"
	"log"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

type ImageService interface {
	UploadImage(file *multipart.FileHeader, userID string) (*models.Image, error)
	GetUserImages(userID string) ([]models.Image, error)
	GetImageByID(id string, userID string) (*models.Image, error)
	DeleteImage(id string, userID string) error
	ProcessImage(id string, userID string, operation string, params map[string]interface{}) (*models.Image, error)
}

type imageService struct {
	repo     repositories.Repo
	uploadDir string
}

func NewImageService(repo repositories.Repo, uploadDir string) ImageService {
	// Create upload directory if it doesn't exist
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		log.Fatalf("Failed to create upload directory: %v", err)
	}
	return &imageService{
		repo:      repo,
		uploadDir: uploadDir,
	}
}

func (s *imageService) UploadImage(file *multipart.FileHeader, userID string) (*models.Image, error) {
	// Validate file type
	ext := strings.ToLower(filepath.Ext(file.Filename))
	validExts := map[string]bool{".png": true, ".jpg": true, ".jpeg": true, ".webp": true, ".gif": true}
	if !validExts[ext] {
		return nil, errors.New("unsupported file format. Supported: PNG, JPG, JPEG, WebP, GIF")
	}

	// Validate file size (max 10MB)
	if file.Size > 10*1024*1024 {
		return nil, errors.New("file too large. Maximum size is 10MB")
	}

	// Open the uploaded file
	src, err := file.Open()
	if err != nil {
		return nil, errors.New("failed to open uploaded file")
	}
	defer src.Close()

	// Generate unique filename
	id := uuid.New().String()
	filename := fmt.Sprintf("%s%s", id, ext)
	filePath := filepath.Join(s.uploadDir, filename)

	// Create destination file
	dst, err := os.Create(filePath)
	if err != nil {
		return nil, errors.New("failed to create file on server")
	}
	defer dst.Close()

	// Copy file contents
	if _, err = io.Copy(dst, src); err != nil {
		os.Remove(filePath)
		return nil, errors.New("failed to save file")
	}

	// Create image record
	image := &models.Image{
		ID:        id,
		UserID:    userID,
		FileName:  file.Filename,
		FilePath:  filePath,
		FileSize:  file.Size,
		MimeType:  file.Header.Get("Content-Type"),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.repo.CreateImage(image); err != nil {
		os.Remove(filePath)
		return nil, errors.New("failed to save image record")
	}

	return image, nil
}

func (s *imageService) GetUserImages(userID string) ([]models.Image, error) {
	return s.repo.GetImagesByUserID(userID)
}

func (s *imageService) GetImageByID(id string, userID string) (*models.Image, error) {
	image, err := s.repo.GetImageByID(id)
	if err != nil {
		return nil, errors.New("image not found")
	}
	if image.UserID != userID {
		return nil, errors.New("unauthorized access to image")
	}
	return image, nil
}

func (s *imageService) DeleteImage(id string, userID string) error {
	image, err := s.GetImageByID(id, userID)
	if err != nil {
		return err
	}

	// Delete file from disk
	os.Remove(image.FilePath)

	return s.repo.DeleteImage(id, userID)
}

func (s *imageService) ProcessImage(id string, userID string, operation string, params map[string]interface{}) (*models.Image, error) {
	// This is where server-side image processing would happen
	// Currently returns the original image info
	image, err := s.GetImageByID(id, userID)
	if err != nil {
		return nil, err
	}
	return image, nil
}