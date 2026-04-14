package services

import (
	"image-processing-service/internal/models"
	"time"

	"github.com/golang-jwt/jwt/v5"
)



type AuthService interface{
	GenerateToken(user models.User)(string,error)
	ValidateToken(token string)(*jwt.Token,error)
}

type authService struct{
	Secret string
}

func NewAuthService(secret string)AuthService{
	return &authService{
		Secret: secret,
	}
}



func(s *authService)GenerateToken(user models.User)(string,error){
	claims:=jwt.MapClaims{
		"user_id":user.ID,
		"email":user.Email,
		"iat":time.Now().Unix(),
		"exp":time.Now().Add(24*time.Hour).Unix(),
	}
	token:=jwt.NewWithClaims(jwt.SigningMethodHS256,claims)
	tokenString,err:=token.SignedString([]byte(s.Secret))
	if err!=nil{
		return "",err
	}
	return tokenString,nil
}


func(s *authService) ValidateToken(tokenString string)(*jwt.Token,error){
	token,err:=jwt.Parse(tokenString,func(t *jwt.Token) (any, error) {
		if _,ok:=t.Method.(*jwt.SigningMethodHMAC);!ok{
			return nil,jwt.ErrTokenSignatureInvalid
		}
		return []byte(s.Secret),nil
	})
	if err!=nil{
		return nil,err
	}
	return token,nil
}