package services

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"time"
)

// CalcomService handles Cal.com API interactions
type CalcomService struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

// CalcomBooking represents a booking from Cal.com API
type CalcomBooking struct {
	ID          int       `json:"id"`
	UID         string    `json:"uid"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	StartTime   time.Time `json:"startTime"`
	EndTime     time.Time `json:"endTime"`
	Status      string    `json:"status"`
	Attendees   []struct {
		ID       int    `json:"id"`
		Email    string `json:"email"`
		Name     string `json:"name"`
		TimeZone string `json:"timeZone"`
	} `json:"attendees"`
	User struct {
		ID       int    `json:"id"`
		Email    string `json:"email"`
		Name     string `json:"name"`
		TimeZone string `json:"timeZone"`
	} `json:"user"`
	Payment []struct {
		ID       int     `json:"id"`
		Amount   float64 `json:"amount"`
		Currency string  `json:"currency"`
		Success  bool    `json:"success"`
	} `json:"payment"`
	Metadata        map[string]interface{} `json:"metadata"`
	EventTypeID     int                    `json:"eventTypeId"`
	CancellationReason string              `json:"cancellationReason,omitempty"`
}

// CalcomBookingsResponse is the API response for bookings list
type CalcomBookingsResponse struct {
	Bookings []CalcomBooking `json:"bookings"`
}

// NewCalcomService creates a new Cal.com service instance
func NewCalcomService(apiKey, baseURL string) *CalcomService {
	return &CalcomService{
		apiKey:  apiKey,
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// IsConfigured returns true if the Cal.com API is configured
func (s *CalcomService) IsConfigured() bool {
	return s.apiKey != ""
}

// GetBookings fetches all bookings from Cal.com
func (s *CalcomService) GetBookings() ([]CalcomBooking, error) {
	if !s.IsConfigured() {
		return nil, fmt.Errorf("Cal.com API key not configured")
	}

	// Build URL with query parameters
	endpoint := fmt.Sprintf("%s/bookings", s.baseURL)
	u, err := url.Parse(endpoint)
	if err != nil {
		return nil, fmt.Errorf("failed to parse URL: %w", err)
	}

	q := u.Query()
	q.Set("apiKey", s.apiKey)
	u.RawQuery = q.Encode()

	log.Printf("Fetching bookings from Cal.com: %s", s.baseURL+"/bookings")

	req, err := http.NewRequest("GET", u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("Cal.com API error: %d %s - Body: %s", resp.StatusCode, resp.Status, string(body))
		return nil, fmt.Errorf("Cal.com API error: %d %s", resp.StatusCode, resp.Status)
	}

	var bookingsResp CalcomBookingsResponse
	if err := json.Unmarshal(body, &bookingsResp); err != nil {
		log.Printf("Failed to parse response: %s", string(body))
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	log.Printf("Successfully fetched %d bookings from Cal.com", len(bookingsResp.Bookings))
	return bookingsResp.Bookings, nil
}

// GetUpcomingBookings returns bookings that are scheduled for the future
func (s *CalcomService) GetUpcomingBookings(limit int) ([]CalcomBooking, error) {
	bookings, err := s.GetBookings()
	if err != nil {
		return nil, err
	}

	now := time.Now()
	var upcoming []CalcomBooking

	for _, b := range bookings {
		if b.StartTime.After(now) && b.Status == "ACCEPTED" {
			upcoming = append(upcoming, b)
		}
	}

	// Sort by start time (earliest first) - already sorted from API typically
	// but let's ensure it
	for i := 0; i < len(upcoming)-1; i++ {
		for j := i + 1; j < len(upcoming); j++ {
			if upcoming[j].StartTime.Before(upcoming[i].StartTime) {
				upcoming[i], upcoming[j] = upcoming[j], upcoming[i]
			}
		}
	}

	if limit > 0 && len(upcoming) > limit {
		upcoming = upcoming[:limit]
	}

	return upcoming, nil
}

// GetPastBookings returns bookings that have already occurred
func (s *CalcomService) GetPastBookings(limit int) ([]CalcomBooking, error) {
	bookings, err := s.GetBookings()
	if err != nil {
		return nil, err
	}

	now := time.Now()
	var past []CalcomBooking

	for _, b := range bookings {
		if b.EndTime.Before(now) && b.Status == "ACCEPTED" {
			past = append(past, b)
		}
	}

	// Sort by start time (most recent first)
	for i := 0; i < len(past)-1; i++ {
		for j := i + 1; j < len(past); j++ {
			if past[j].StartTime.After(past[i].StartTime) {
				past[i], past[j] = past[j], past[i]
			}
		}
	}

	if limit > 0 && len(past) > limit {
		past = past[:limit]
	}

	return past, nil
}

// GetBookingsInRange returns bookings within a date range
func (s *CalcomService) GetBookingsInRange(start, end time.Time) ([]CalcomBooking, error) {
	bookings, err := s.GetBookings()
	if err != nil {
		return nil, err
	}

	var inRange []CalcomBooking

	for _, b := range bookings {
		if (b.StartTime.After(start) || b.StartTime.Equal(start)) &&
			(b.StartTime.Before(end) || b.StartTime.Equal(end)) &&
			b.Status == "ACCEPTED" {
			inRange = append(inRange, b)
		}
	}

	return inRange, nil
}

// DashboardStats contains aggregated statistics for the dashboard
type DashboardStats struct {
	TotalStudents        int                    `json:"totalStudents"`
	LessonsThisMonth     int                    `json:"lessonsThisMonth"`
	TotalEarnedThisMonth float64                `json:"totalEarnedThisMonth"`
	Currency             string                 `json:"currency"`
	UpcomingLessons      []CalcomBooking        `json:"upcomingLessons"`
	LastLesson           *CalcomBooking         `json:"lastLesson"`
	AllBookings          []CalcomBooking        `json:"allBookings"`
}

// GetDashboardStats calculates all dashboard statistics
func (s *CalcomService) GetDashboardStats() (*DashboardStats, error) {
	bookings, err := s.GetBookings()
	if err != nil {
		return nil, err
	}

	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	endOfMonth := startOfMonth.AddDate(0, 1, 0).Add(-time.Second)

	stats := &DashboardStats{
		Currency:    "USD",
		AllBookings: bookings,
	}

	// Track unique students (by email)
	studentEmails := make(map[string]bool)

	var upcomingBookings []CalcomBooking
	var pastBookings []CalcomBooking

	for _, b := range bookings {
		if b.Status != "ACCEPTED" && b.Status != "PENDING" {
			continue
		}

		// Count unique students
		for _, attendee := range b.Attendees {
			studentEmails[attendee.Email] = true
		}

		// Categorize by time
		if b.StartTime.After(now) {
			upcomingBookings = append(upcomingBookings, b)
		} else if b.EndTime.Before(now) {
			pastBookings = append(pastBookings, b)
		}

		// Count lessons this month and calculate earnings
		if b.StartTime.After(startOfMonth) && b.StartTime.Before(endOfMonth) {
			stats.LessonsThisMonth++
			for _, payment := range b.Payment {
				if payment.Success {
					stats.TotalEarnedThisMonth += payment.Amount
					if payment.Currency != "" {
						stats.Currency = payment.Currency
					}
				}
			}
		}
	}

	stats.TotalStudents = len(studentEmails)

	// Sort upcoming by start time (earliest first)
	for i := 0; i < len(upcomingBookings)-1; i++ {
		for j := i + 1; j < len(upcomingBookings); j++ {
			if upcomingBookings[j].StartTime.Before(upcomingBookings[i].StartTime) {
				upcomingBookings[i], upcomingBookings[j] = upcomingBookings[j], upcomingBookings[i]
			}
		}
	}

	// Get next 3 upcoming lessons
	if len(upcomingBookings) > 3 {
		stats.UpcomingLessons = upcomingBookings[:3]
	} else {
		stats.UpcomingLessons = upcomingBookings
	}

	// Sort past by start time (most recent first) and get last lesson
	for i := 0; i < len(pastBookings)-1; i++ {
		for j := i + 1; j < len(pastBookings); j++ {
			if pastBookings[j].StartTime.After(pastBookings[i].StartTime) {
				pastBookings[i], pastBookings[j] = pastBookings[j], pastBookings[i]
			}
		}
	}

	if len(pastBookings) > 0 {
		stats.LastLesson = &pastBookings[0]
	}

	return stats, nil
}
