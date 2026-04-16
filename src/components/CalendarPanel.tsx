'use client'

import React from 'react'
import styles from './CalendarPanel.module.css'

const CalendarPanel: React.FC = () => {
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const firstDay = new Date(currentYear, currentMonth, 1)
  const lastDay = new Date(currentYear, currentMonth + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  const days = []
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2>📅 {monthNames[currentMonth]} {currentYear}</h2>
      </div>

      <div className={styles.content}>
        <div className={styles.weekdaysRow}>
          {dayNames.map(day => (
            <div key={day} className={styles.weekdayHeader}>{day}</div>
          ))}
        </div>

        <div className={styles.daysGrid}>
          {days.map((day, index) => (
            <div
              key={index}
              className={`${styles.dayCell} ${
                day === today.getDate() && currentMonth === today.getMonth() ? styles.today : ''
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        <div className={styles.todayInfo}>
          Today: {today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
      </div>
    </div>
  )
}

export default CalendarPanel
