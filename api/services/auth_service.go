package services

import (
	"errors"

	"image-processing-service/internal/models"
	"image-processing-service/internal/utils"
	"image-processing-service/repositories"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type AuthService interface {
	GenerateToken(user models.User) (string, error)
	ValidateToken(tokenString string) (*jwt.Token, error)
	Login(email, password string) (string, *models.User, error)
	Signup(user models.User) (*models.User, error)
}

type authService struct {
	repo        repositories.Repo
	SecreteKey string
}

func NewAuthService(repo repositories.Repo, Secret string) AuthService {
	return &authService{
		repo:       repo,
		SecreteKey: Secret,
	}
}

func (s *authService) GenerateToken(user models.User) (string, error) {
	claims := jwt.MapClaims{
		"user_id": user.ID,
		"email":   user.Email,
		"iat":     time.Now().Unix(),
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.SecreteKey))
	if err != nil {
		return "", err
	}
	return tokenString, nil
}

func (s *authService) ValidateToken(tokenString string) (*jwt.Token, error) {
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrTokenSignatureInvalid
		}
		return []byte(s.SecreteKey), nil
	})
	if err != nil {
		return nil, err
	}
	return token, nil
}

func (s *authService) Login(email, password string) (string, *models.User, error) {
	user, err := s.repo.FindByEmail(email)
	if err != nil {
		return "", nil, errors.New("invalid credentials")
	}
	if !utils.CheckPassword(user.Password, password) {
		return "", nil, errors.New("invalid credentials")
	}

	token, err := s.GenerateToken(*user)
	if err != nil {
		return "", nil, err
	}
	return token, user, nil
}

func (s *authService) Signup(user models.User) (*models.User, error) {
	hashed, err := utils.HashPassword(user.Password)
	if err != nil {
		return nil, errors.New("could not hash password")
	}
	user.Password = hashed

	created, err := s.repo.Signup(user)
	if err != nil {
		return nil, errors.New("could not signup user")
	}
	return created, nil
}