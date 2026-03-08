import React, { useEffect, useState, useMemo } from 'react'
import { Card, Typography, Space, Tooltip, Button } from 'antd'
import { FireOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import { useRequest } from 'ahooks'
import dayjs, { type Dayjs } from 'dayjs'

import { studyLogApi, type StudyLogStreakResponse, type StudyLogMonthItem } from '@/api/studyLog'

const { Text } = Typography

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export const StudyCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs())
  // 记录日期 -> 学习项的映射
  const [monthLogsMap, setMonthLogsMap] = useState<Map<string, StudyLogMonthItem>>(new Map())
  const [streakData, setStreakData] = useState<StudyLogStreakResponse>({
    streak_days: 0,
    today_checked_in: false,
  })

  // 获取连胜数据
  useRequest(studyLogApi.getStreak, {
    onSuccess: (data) => {
      setStreakData(data)
    },
  })

  // 获取月份打卡记录
  const { run: fetchMonthLogs, loading: logsLoading } = useRequest(studyLogApi.getMonthLogs, {
    manual: true,
    onSuccess: (data) => {
      const newMap = new Map<string, StudyLogMonthItem>()
      data.checked_in_dates.forEach(item => {
        newMap.set(item.date, item)
      })
      setMonthLogsMap(newMap)
    },
  })

  // 当月份变化时重新获取
  useEffect(() => {
    fetchMonthLogs(currentDate.year(), currentDate.month() + 1)
  }, [currentDate, fetchMonthLogs])

  const handlePrevMonth = () => {
    setCurrentDate(prev => prev.subtract(1, 'month'))
  }

  const handleNextMonth = () => {
    setCurrentDate(prev => prev.add(1, 'month'))
  }

  // 生成日历网格数据
  const calendarGrid = useMemo(() => {
    const startOfMonth = currentDate.startOf('month')
    const endOfMonth = currentDate.endOf('month')
    
    const startDate = startOfMonth.startOf('week') // 包含上个月的尾巴
    const endDate = endOfMonth.endOf('week') // 包含下个月的开头

    const grid: Dayjs[] = []
    let current = startDate
    
    while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
      grid.push(current)
      current = current.add(1, 'day')
    }
    
    return grid
  }, [currentDate])

  const today = dayjs()

  return (
    <Card
      title={
        <Space className="py-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
            <FireOutlined className="text-lg" />
          </div>
          <span className="font-bold text-lg text-gray-800">学习打卡</span>
        </Space>
      }
      className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden"
      headStyle={{ borderBottom: 'none', paddingTop: '24px', paddingBottom: '12px' }}
      bodyStyle={{ padding: '24px', paddingTop: 0 }}
      extra={
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Text className="text-gray-500">连胜</Text>
            <Text className="text-xl font-black text-orange-500">{streakData.streak_days}</Text>
            <Text className="text-gray-500">天</Text>
          </div>
        </div>
      }
    >
      <div className="mt-2">
        {/* 日历头部：月份切换 */}
        <div className="flex justify-between items-center mb-6 px-2">
          <Button type="text" icon={<LeftOutlined />} onClick={handlePrevMonth} className="text-gray-400 hover:text-gray-700" />
          <span className="text-lg font-bold text-gray-700">
            {currentDate.format('YYYY年 MM月')}
          </span>
          <Button 
            type="text" 
            icon={<RightOutlined />} 
            onClick={handleNextMonth} 
            disabled={currentDate.isSame(today, 'month')}
            className="text-gray-400 hover:text-gray-700" 
          />
        </div>

        {/* 星期表头 */}
        <div className="grid grid-cols-7 gap-y-4 gap-x-2 text-center mb-4">
          {WEEKDAYS.map(day => (
            <div key={day} className="text-sm font-medium text-gray-400">
              {day}
            </div>
          ))}

          {/* 日期网格 */}
          {calendarGrid.map((date, index) => {
            const isCurrentMonth = date.isSame(currentDate, 'month')
            const dateStr = date.format('YYYY-MM-DD')
            const logItem = monthLogsMap.get(dateStr)
            const isToday = date.isSame(today, 'day')
            const isFuture = date.isAfter(today, 'day')

            // 基础样式
            let cellClass = "relative flex items-center justify-center h-10 w-full rounded-xl transition-all "
            let textClass = "z-10 font-medium text-sm "

            if (!isCurrentMonth) {
              cellClass += "opacity-30 "
              textClass += "text-gray-300"
            } else if (logItem) {
              cellClass += "bg-orange-50 "
              textClass += "text-orange-600 font-bold"
            } else if (isToday) {
              cellClass += "bg-gray-100 "
              textClass += "text-gray-800"
            } else if (isFuture) {
              textClass += "text-gray-300"
            } else {
              textClass += "text-gray-600"
            }

            const cellContent = (
              <div className={cellClass}>
                {logItem && (
                  <div className="absolute inset-0 bg-orange-100/50 rounded-xl border border-orange-200" />
                )}
                {logItem && (
                  <FireOutlined className="absolute text-orange-500 opacity-20 text-2xl" />
                )}
                <span className={textClass}>
                  {date.date()}
                </span>
              </div>
            )

            return (
              <div key={index} className={logsLoading ? 'opacity-50' : ''}>
                {logItem ? (
                  <Tooltip 
                    title={
                      <div className="text-center">
                        <div className="font-bold mb-1">已打卡</div>
                        <div className="text-xs text-gray-300">{logItem.course_title || '学习了一篇课程'}</div>
                      </div>
                    }
                    color="#1f2937"
                    placement="top"
                  >
                    <div className="cursor-pointer hover:scale-110 transition-transform">
                      {cellContent}
                    </div>
                  </Tooltip>
                ) : (
                  <div className={isFuture ? "cursor-not-allowed" : "cursor-default"}>
                    {cellContent}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
