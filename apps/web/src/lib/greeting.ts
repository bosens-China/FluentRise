/**
 * 根据当前时间获取问候语
 */
export function getGreeting(name?: string | null): string {
  const hour = new Date().getHours();
  const timeGreeting = 
    hour < 6 ? '夜深了' :
    hour < 9 ? '早上好' :
    hour < 12 ? '上午好' :
    hour < 14 ? '中午好' :
    hour < 18 ? '下午好' :
    '晚上好';
  
  return name ? `${timeGreeting}，${name}！` : `${timeGreeting}！`;
}

/**
 * 获取鼓励语
 */
export function getEncouragement(): string {
  const messages = [
    '继续学习，保持连胜。',
    '每一天的进步都值得庆祝。',
    '坚持就是胜利，继续往前走。',
    '你的努力终将开花结果。',
    '今天的学习目标完成了吗？',
    '保持这个节奏，你做得很好。',
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}
