package middlewares

import (
	"image-processing-service/services"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)




func AuthMiddleware(authService services.AuthService) gin.HandlerFunc{
	return func(ctx *gin.Context) {
		authHeader:=ctx.GetHeader("Authorization")
		if authHeader==""{
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error":"Missing authorization token"})
			return 
		}
		tokenString:=strings.TrimSpace(authHeader)
		if strings.HasPrefix(strings.TrimSpace(authHeader),"Bearer"){
			tokenString=strings.TrimSpace(tokenString[7:])
		}
		claims,err:=authService.ValidateToken(tokenString)
		if err!=nil{
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error":"invalid  or expired token"})
			return 
		}
		ctx.Set("email",claims)
		ctx.Next()
	}
}