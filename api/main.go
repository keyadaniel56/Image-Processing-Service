package main

import (
	"image-processing-service/internal/database"
	"image-processing-service/internal/middlewares"
	"image-processing-service/internal/models"
	"image-processing-service/repositories"
	"image-processing-service/services"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func main() {
	// Initialize database
	database.InititializeDatabase()

	// Setup repositories and services
	repo := repositories.NewRepository(database.DB)
	authService := services.NewAuthService(repo, "image-processing-secret-key-2024")
	imageService := services.NewImageService(repo, "./uploads")

	// Setup Gin router
	r := gin.Default()

	// CORS middleware - allow frontend on any port
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")
		c.Header("Access-Control-Allow-Credentials", "true")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	})

	// Health check
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Image Processing API is running"})
	})

	// Serve uploaded files
	r.Static("/uploads", "./uploads")

	// Auth routes
	api := r.Group("/api")
	{
		api.POST("/signup", func(c *gin.Context) {
			var input struct {
				Username string `json:"username" binding:"required"`
				Email    string `json:"email" binding:"required,email"`
				Password string `json:"password" binding:"required,min=8"`
			}
			if err := c.ShouldBindJSON(&input); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			user := models.User{
				ID:       uuid.New().String(),
				UserName: input.Username,
				Email:    input.Email,
				Password: input.Password,
			}

			created, err := authService.Signup(user)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusCreated, gin.H{
				"message": "Account created successfully",
				"user": gin.H{
					"id":       created.ID,
					"username": created.UserName,
					"email":    created.Email,
				},
			})
		})

		api.POST("/login", func(c *gin.Context) {
			var input struct {
				Email    string `json:"email" binding:"required,email"`
				Password string `json:"password" binding:"required"`
			}
			if err := c.ShouldBindJSON(&input); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			token, user, err := authService.Login(input.Email, input.Password)
			if err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"token": token,
				"user": gin.H{
					"id":       user.ID,
					"username": user.UserName,
					"email":    user.Email,
				},
			})
		})
	}

	// Protected routes (require auth)
	protected := r.Group("/api")
	protected.Use(middlewares.AuthMiddleware(authService))
	{
		// Get user profile
		protected.GET("/me", func(c *gin.Context) {
			userID := c.GetString("user_id")
			email := c.GetString("email")
			c.JSON(http.StatusOK, gin.H{
				"user": gin.H{
					"id":    userID,
					"email": email,
				},
			})
		})

		// Upload image
		protected.POST("/images/upload", func(c *gin.Context) {
			userID := c.GetString("user_id")
			file, err := c.FormFile("image")
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "No image file provided"})
				return
			}

			image, err := imageService.UploadImage(file, userID)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusCreated, gin.H{
				"message": "Image uploaded successfully",
				"image": gin.H{
					"id":        image.ID,
					"file_name": image.FileName,
					"file_size": image.FileSize,
					"mime_type": image.MimeType,
					"url":       "/uploads/" + filepath.Base(image.FilePath),
					"created_at": image.CreatedAt,
				},
			})
		})

		// Get all user images
		protected.GET("/images", func(c *gin.Context) {
			userID := c.GetString("user_id")
			images, err := imageService.GetUserImages(userID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch images"})
				return
			}

			var result []gin.H
			for _, img := range images {
				result = append(result, gin.H{
					"id":         img.ID,
					"file_name":  img.FileName,
					"file_size":  img.FileSize,
					"mime_type":  img.MimeType,
					"url":        "/uploads/" + filepath.Base(img.FilePath),
					"created_at": img.CreatedAt,
				})
			}

			c.JSON(http.StatusOK, gin.H{"images": result})
		})

		// Get single image
		protected.GET("/images/:id", func(c *gin.Context) {
			userID := c.GetString("user_id")
			id := c.Param("id")

			image, err := imageService.GetImageByID(id, userID)
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"image": gin.H{
					"id":         image.ID,
					"file_name":  image.FileName,
					"file_size":  image.FileSize,
					"mime_type":  image.MimeType,
					"url":        "/uploads/" + filepath.Base(image.FilePath),
					"created_at": image.CreatedAt,
				},
			})
		})

		// Delete image
		protected.DELETE("/images/:id", func(c *gin.Context) {
			userID := c.GetString("user_id")
			id := c.Param("id")

			if err := imageService.DeleteImage(id, userID); err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{"message": "Image deleted successfully"})
		})

		// Process image (placeholder for future server-side processing)
		protected.POST("/images/:id/process", func(c *gin.Context) {
			userID := c.GetString("user_id")
			id := c.Param("id")

			var input struct {
				Operation string                 `json:"operation" binding:"required"`
				Params    map[string]interface{} `json:"params"`
			}
			if err := c.ShouldBindJSON(&input); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			image, err := imageService.ProcessImage(id, userID, input.Operation, input.Params)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"message": "Image processed successfully",
				"image": gin.H{
					"id":         image.ID,
					"file_name":  image.FileName,
					"url":        "/uploads/" + filepath.Base(image.FilePath),
				},
			})
		})
	}

	// Get port from environment or default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Printf("API available at http://localhost:%s/api", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}