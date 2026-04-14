package repositories

import "image-processing-service/internal/models"

type Repo interface {
	GenerateToken(models.User) error
}
