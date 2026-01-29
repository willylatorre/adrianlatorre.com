package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"playground-server/services"
)

// CalcomHandler handles Cal.com related HTTP requests
type CalcomHandler struct {
	service *services.CalcomService
}

// NewCalcomHandler creates a new Cal.com handler with dependency injection
func NewCalcomHandler(service *services.CalcomService) *CalcomHandler {
	return &CalcomHandler{service: service}
}

// GetStatus returns the configuration status of Cal.com API
func (h *CalcomHandler) GetStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"configured": h.service.IsConfigured(),
	})
}

// GetDashboardStats returns aggregated statistics for the wifi dashboard
func (h *CalcomHandler) GetDashboardStats(c *gin.Context) {
	if !h.service.IsConfigured() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Cal.com API not configured",
		})
		return
	}

	stats, err := h.service.GetDashboardStats()
	if err != nil {
		log.Printf("ERROR: Failed to get dashboard stats: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": stats,
	})
}

// GetBookings returns all bookings
func (h *CalcomHandler) GetBookings(c *gin.Context) {
	if !h.service.IsConfigured() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Cal.com API not configured",
		})
		return
	}

	bookings, err := h.service.GetBookings()
	if err != nil {
		log.Printf("ERROR: Failed to get bookings: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": bookings,
	})
}

// GetUpcomingBookings returns upcoming bookings
func (h *CalcomHandler) GetUpcomingBookings(c *gin.Context) {
	if !h.service.IsConfigured() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Cal.com API not configured",
		})
		return
	}

	bookings, err := h.service.GetUpcomingBookings(10) // Get up to 10 upcoming
	if err != nil {
		log.Printf("ERROR: Failed to get upcoming bookings: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": bookings,
	})
}

// GetPastBookings returns past bookings
func (h *CalcomHandler) GetPastBookings(c *gin.Context) {
	if !h.service.IsConfigured() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Cal.com API not configured",
		})
		return
	}

	bookings, err := h.service.GetPastBookings(20) // Get up to 20 past
	if err != nil {
		log.Printf("ERROR: Failed to get past bookings: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": bookings,
	})
}
