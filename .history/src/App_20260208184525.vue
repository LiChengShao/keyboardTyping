<template>
  <div class="typing-game">
    <!-- 标题和难度选择 -->
    <header class="game-header">
      <h1><i class="fas fa-keyboard"></i> 打字速度测试</h1>
      <div class="difficulty-selector">
        <button
            v-for="level in difficultyLevels"
            :key="level.id"
            @click="selectDifficulty(level.id)"
            :class="{ active: currentDifficulty === level.id }"
        >
          {{ level.name }}
        </button>
      </div>
    </header>

    <!-- 游戏控制区域 -->
    <div class="game-controls">
      <div class="mode-selector">
        <button
            v-for="mode in gameModes"
            :key="mode.id"
            @click="selectMode(mode.id)"
            :class="{ active: currentMode === mode.id }"
        >
          <i :class="mode.icon"></i> {{ mode.name }}
        </button>
      </div>

      <div class="control-buttons">
        <button @click="startGame" :disabled="isPlaying" class="btn-start">
          <i class="fas fa-play"></i> {{ isPlaying ? '进行中...' : '开始游戏' }}
        </button>
        <button @click="resetGame" class="btn-reset">
          <i class="fas fa-redo"></i> 重置
        </button>
      </div>
    </div>

    <!-- 统计数据 -->
    <div class="stats-container" v-if="showStats">
      <div class="stat-box">
        <div class="stat-value">{{ wpm }}</div>
        <div class="stat-label">WPM</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">{{ accuracy }}%</div>
        <div class="stat-label">准确率</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">{{ timeLeft }}</div>
        <div class="stat-label">剩余时间(秒)</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">{{ correctCount }}</div>
        <div class="stat-label">正确字符</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">{{ errorCount }}</div>
        <div class="stat-label">错误字符</div>
      </div>
    </div>

    <!-- 游戏区域 -->
    <div class="game-area" v-if="currentMode === 'quote'">
      <div class="quote-display">
        <div
            v-for="(char, index) in currentQuote"
            :key="index"
            :class="getCharClass(index)"
        >
          {{ char }}
        </div>
      </div>
      <textarea
          ref="inputField"
          v-model="userInput"
          @input="handleInput"
          @keydown="handleKeyDown"
          :disabled="!isPlaying"
          placeholder="点击'开始游戏'后，在这里开始打字..."
          class="typing-input"
          rows="10"
      ></textarea>
    </div>

    <div class="game-area" v-if="currentMode === 'words'">
      <div class="words-display">
        <div
            v-for="(word, wordIndex) in wordsToType"
            :key="wordIndex"
            class="word"
            :class="getWordClass(wordIndex)"
        >
          <span
              v-for="(char, charIndex) in word"
              :key="charIndex"
              :class="getWordCharClass(wordIndex, charIndex)"
          >
            {{ char }}
          </span>
        </div>
      </div>
      <textarea
          ref="inputField"
          v-model="userInput"
          @input="handleWordInput"
          @keydown.space.prevent="handleSpace"
          @keydown.delete="handleBackspace"
          :disabled="!isPlaying"
          placeholder="输入上面的单词，按空格进入下一个单词..."
          class="typing-input"
          rows="3"
      ></textarea>
    </div>

    <!-- 进度条 -->
    <div class="progress-container" v-if="isPlaying">
      <div class="progress-bar" :style="{ width: progress + '%' }"></div>
    </div>

    <!-- 历史记录 -->
    <div class="history-section" v-if="history.length > 0">
      <h3><i class="fas fa-history"></i> 历史记录</h3>
      <div class="history-list">
        <div v-for="(record, index) in history.slice(0, 5)" :key="index" class="history-item">
          <span class="mode">{{ record.mode }}</span>
          <span class="difficulty">{{ record.difficulty }}</span>
          <span class="wpm">{{ record.wpm }} WPM</span>
          <span class="accuracy">{{ record.accuracy }}% 准确率</span>
          <span class="date">{{ formatDate(record.timestamp) }}</span>
        </div>
      </div>
    </div>

    <!-- 结果弹窗 -->
    <div class="result-modal" v-if="showResult">
      <div class="modal-content">
        <h2>测试完成！</h2>
        <div class="result-stats">
          <div class="result-stat">
            <div class="result-value">{{ finalWPM }}</div>
            <div class="result-label">WPM</div>
          </div>
          <div class="result-stat">
            <div class="result-value">{{ finalAccuracy }}%</div>
            <div class="result-label">准确率</div>
          </div>
        </div>
        <div class="result-details">
          <p><i class="fas fa-check-circle"></i> 正确字符: {{ correctCount }}</p>
          <p><i class="fas fa-times-circle"></i> 错误字符: {{ errorCount }}</p>
          <p><i class="fas fa-clock"></i> 用时: {{ totalTime }} 秒</p>
        </div>
        <div class="modal-buttons">
          <button @click="playAgain" class="btn-play-again">
            <i class="fas fa-play-circle"></i> 再玩一次
          </button>
          <button @click="closeResult" class="btn-close">
            <i class="fas fa-times"></i> 关闭
          </button>
        </div>
      </div>
    </div>

    <!-- 热键提示 -->
    <div class="hotkey-hint">
      <p><i class="fas fa-lightbulb"></i> 提示: 按 <kbd>Esc</kbd> 重置游戏 | 按 <kbd>Enter</kbd> 开始新游戏</p>
    </div>
  </div>

  <!-- 自定义计时器图标 -->
  <div
      class="custom-timer-icon"
      :style="{ right: ballPosition.right + 'px', top: ballPosition.top + 'px', cursor: isDragging ? 'grabbing' : 'grab' }"
      @mousedown="startDrag"
      @dblclick="resetCustomTimer"
      @contextmenu.prevent="toggleTodoBox"
      @mouseenter="onBallMouseEnter"
      @mouseleave="onBallMouseLeave"
  >
    <!-- 双眼容器：居中放置 -->
    <div class="eyes-container">
      <!-- 左眼：动态绑定旋转角度 -->
      <div class="eye">
        <div class="pupil" :style="{ transform: `rotate(${eyeRotateAngle}deg)` }">
          <div class="pupil-core"></div>
        </div>
      </div>
      <!-- 右眼：和左眼同步旋转 -->
      <div class="eye">
        <div class="pupil" :style="{ transform: `rotate(${eyeRotateAngle}deg)` }">
          <div class="pupil-core"></div>
        </div>
      </div>
    </div>

    <!-- 计时器显示：移到眼睛下方，保留原有功能 -->
    <span class="timer-display">{{ formatTime(customTimerValue) }}</span>

    <!-- 待办事项框 -->
    <div class="todo-box" v-if="showTodoBox">
      <h3>待办事项</h3>
      <div class="todo-input-group">
        <input type="text" v-model="newTodoText" @keyup.enter="addTodoItem" placeholder="添加新事项...">
        <button @click="addTodoItem" :disabled="!newTodoText.trim()">添加</button>
      </div>
      <ul class="todo-list">
        <li v-for="(todo, index) in todoItems" :key="index">
          <span>{{ todo }}</span>
          <button @click="deleteTodoItem(index)">删除</button>
        </li>
        <li v-if="todoItems.length === 0" class="no-todos">暂无待办事项</li>
      </ul>
    </div>

    <!-- 虚拟键盘显示 -->
    <div class="virtual-keyboard" v-if="isPlaying">
      <div class="keyboard-row" v-for="(row, rowIndex) in keyboardLayout" :key="rowIndex">
        <div
            v-for="(key, keyIndex) in row"
            :key="keyIndex"
            class="keyboard-key"
            :class="{
        'key-pressed': isKeyPressed(key),
        'key-special': ['Backspace', 'Tab', 'CapsLock', 'Enter', 'Shift', 'Ctrl', 'Alt', 'Space'].includes(key),
        'key-space': key === 'Space'
      }"
        >
          {{ key }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import xiyoujiData from '@/assets/xiyouji-typing.json';
export default {
  name: 'TypingTest',
  data() {
    return {
      // 游戏状态
      isPlaying: false,
      showStats: false,
      showResult: false,
      startTime: null,
      timer: null,
      timeLeft: 60,

      // 游戏模式
      currentMode: 'quote', // 'quote' 或 'words'
      currentDifficulty: 'medium',

      // 游戏数据
      currentQuote: '',
      userInput: '',
      wordsToType: [],
      currentWordIndex: 0,
      currentCharIndex: 0,
      typedChars: [],
      correctCount: 0,
      errorCount: 0,

      // 最终结果
      finalWPM: 0,
      finalAccuracy: 0,
      totalTime: 0,

      // 历史记录
      history: [],

      // 自定义计时器状态
      customTimerValue: 0,
      customTimerInterval: null,
      isCustomTimerRunning: false,
      // 待办事项相关
      showTodoBox: false,
      newTodoText: '',
      todoItems: [], // 存储待办事项的数组
      // 拖动计时球相关
      dragOffset: { x: 0, y: 0 },
      ballPosition: { right: 30, top: 50 }, // 初始位置百分比或像素
      isDragging: false,
      isJustClick: true, // 标记是否为纯点击
      startX: 0, // 新增：鼠标按下时的初始X坐标
      startY: 0, // 新增：鼠标按下时的初始Y坐标
      dragThreshold: 5, // 新增：拖拽判定阈值(px)，小于此距离不算拖拽
      // 新增：眼睛跟随相关
      eyeRotateAngle: 0, // 眼珠旋转角度（核心）
      isBallHover: false, // 鼠标是否悬浮在计时球上
      previousAngle: 0, // 新增：记录上一次的角度

      // 配置选项
      difficultyLevels: [
        { id: 'easy', name: '简单' },
        { id: 'medium', name: '中等' },
        { id: 'hard', name: '困难' },
        { id: 'hell', name: '地狱' },
        { id: 'heavn', name: '天堂' },
      ],
      gameModes: [
        { id: 'quote', name: '段落模式', icon: 'fas fa-paragraph' },
        { id: 'words', name: '单词模式', icon: 'fas fa-font' }
      ],

      // 示例数据
      easyQuotes: [
        "你好，世界！这是一个简单的打字测试。",
        "Vue.js 是一个渐进式JavaScript框架。",
        "每天练习打字可以提高你的输入速度。",
        "编程是一门需要不断练习的技能。",
        "前端开发包括HTML、CSS和JavaScript。"
      ],
      mediumQuotes: [
        "敏捷的棕色狐狸跳过了懒惰的狗，这是一个经典的打字练习句子。",
        "学习编程就像学习一门新语言，需要时间和耐心才能掌握。",
        "前端框架如Vue和React极大地提高了开发效率。",
        "响应式设计确保网站在各种设备上都能良好显示。",
        "代码的可读性比聪明但难以理解的技巧更重要。",
        "而我，可能吗，雅克布-阿尔曼苏尔的一个臣民，会像玫瑰和亚里士多德一样死去？"
      ],
      hardQuotes: [
        "在计算机科学中，算法是解决特定问题的一系列明确指令。数据结构是组织和存储数据的方式，以便有效地访问和修改。",
        "函数式编程是一种编程范式，它将计算视为数学函数的求值，并避免改变状态和可变数据。",
        "异步编程允许程序在等待长时间运行的操作完成时继续执行其他任务，这对于创建响应式应用程序至关重要。"
      ],
      hellQuotes: xiyoujiData.map(item => item.text),
      wordLists: {
        easy: ["你好", "世界", "编程", "学习", "打字", "测试", "游戏", "速度", "键盘", "练习"],
        medium: ["JavaScript", "Vue框架", "响应式设计", "组件开发", "状态管理", "前端工程", "用户体验", "代码质量"],
        hard: ["算法复杂度", "数据结构", "函数式编程", "异步处理", "虚拟DOM", "编译原理", "设计模式", "性能优化"]
      },

      // 键盘相关：存储物理按键code（如KeyA、Space），兼容中英文输入法
      pressedKeys: new Set(),
      keyboardLayout: [
        ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
        ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
        ['CapsLock', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Enter'],
        ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'Shift'],
        ['Ctrl', 'Alt', 'Space', 'Alt', 'Ctrl']
      ]
    };
  },
  computed: {
    // 计算每分钟字数
    wpm() {
      if (!this.isPlaying || !this.startTime) return 0;
      const minutes = (60 - this.timeLeft) / 60;
      const words = this.correctCount / 5; // 通常5个字符算一个单词
      return minutes > 0 ? Math.round(words / minutes) : 0;
    },
    // 计算准确率
    accuracy() {
      const totalTyped = this.correctCount + this.errorCount;
      return totalTyped > 0 ? Math.round((this.correctCount / totalTyped) * 100) : 100;
    },
    // 计算进度
    progress() {
      if (this.currentMode === 'quote') {
        return this.userInput.length / this.currentQuote.length * 100;
      } else {
        return this.currentWordIndex / this.wordsToType.length * 100;
      }
    }
  },
  methods: {
    // 选择难度
    selectDifficulty(level) {
      this.currentDifficulty = level;
      this.resetGame();
    },
    // 选择模式
    selectMode(mode) {
      this.currentMode = mode;
      this.resetGame();
    },
    // 开始游戏
    startGame() {
      if (this.isPlaying) return;
      // 初始化游戏状态
      this.isPlaying = true;
      this.showStats = true;
      this.showResult = false;
      this.startTime = new Date();
      this.timeLeft = 60;
      // 初始化游戏内容
      if (this.currentMode === 'quote') {
       // this.loadRandomQuote();
      } else {
       // this.loadRandomWords();
      }
      // 重置输入
      this.userInput = '';
      this.typedChars = [];
      this.correctCount = 0;
      this.errorCount = 0;
      this.currentWordIndex = 0;
      this.currentCharIndex = 0;
      // 聚焦输入框
      this.$nextTick(() => {
        this.$refs.inputField.focus();
      });
      // 开始计时器
      this.timer = setInterval(() => {
        this.timeLeft--;
        if (this.timeLeft <= 0) {
          this.endGame();
        }
      }, 1000);
    },
    // 加载随机段落
    loadRandomQuote() {
      const quotes = this[`${this.currentDifficulty}Quotes`];
      const randomIndex = Math.floor(Math.random() * quotes.length);
      this.currentQuote = quotes[randomIndex];
    },
    // 加载随机单词
    loadRandomWords() {
      const words = this.wordLists[this.currentDifficulty];
      this.wordsToType = [];
      // 随机选择几个单词
      for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * words.length);
        this.wordsToType.push(words[randomIndex]);
      }
    },

    // 处理段落模式输入
    handleInput() {
      if (!this.isPlaying) return;
      const inputLength = this.userInput.length;
      const quoteLength = this.currentQuote.length;

      // 重置已输入字符的校验状态和计数
      this.typedChars = [];
      this.correctCount = 0;
      this.errorCount = 0;

      // 全量重新比较输入框所有内容
      for (let i = 0; i < inputLength; i++) {
        if (i < quoteLength) { // 只比较到原段落的长度
          if (this.userInput[i] === this.currentQuote[i]) {
            this.typedChars.push({ char: this.userInput[i], correct: true });
            this.correctCount++;
          } else {
            this.typedChars.push({ char: this.userInput[i], correct: false });
            this.errorCount++;
          }
        } else {
          // 输入超过原段落长度的部分都算错误
          this.typedChars.push({ char: this.userInput[i], correct: false });
          this.errorCount++;
        }
      }

      // 如果输入完成
      if (inputLength >= quoteLength) {
        this.endGame();
      }
    },

    // 处理单词模式输入
    handleWordInput() {
      if (!this.isPlaying) return;
      const currentWord = this.wordsToType[this.currentWordIndex];
      const inputLength = this.userInput.length;
      // 检查当前单词的每个字符
      for (let i = this.currentCharIndex; i < inputLength; i++) {
        if (i < currentWord.length) {
          if (this.userInput[i] === currentWord[i]) {
            this.currentCharIndex++;
            this.correctCount++;
          } else {
            this.errorCount++;
          }
        }
      }
    },
    // 处理空格键（单词模式）
    handleSpace() {
      if (!this.isPlaying || this.currentMode !== 'words') return;
      const currentWord = this.wordsToType[this.currentWordIndex];
      const isComplete = this.userInput === currentWord;
      if (isComplete) {
        this.correctCount += (currentWord.length - this.userInput.length);
      } else {
        this.errorCount += Math.abs(currentWord.length - this.userInput.length);
      }
      // 移到下一个单词
      this.userInput = '';
      this.currentWordIndex++;
      this.currentCharIndex = 0;
      // 如果所有单词完成
      if (this.currentWordIndex >= this.wordsToType.length) {
        this.endGame();
      }
    },
    // 处理退格键
    handleBackspace() {
      if (this.currentMode === 'words' && this.userInput.length === 0 && this.currentWordIndex > 0) {
        // 允许回到上一个单词
        this.currentWordIndex--;
        const prevWord = this.wordsToType[this.currentWordIndex];
        this.userInput = prevWord;
        this.currentCharIndex = prevWord.length;
      }
    },
    // 处理按键（用于特殊键）
    handleKeyDown(event) {
      // ESC键重置游戏
      if (event.key === 'Escape') {
        this.resetGame();
      }
      // Enter键开始新游戏
      if (event.key === 'Enter' && !this.isPlaying) {
        this.startGame();
      }
    },
    // 结束游戏
    endGame() {
      this.isPlaying = false;
      clearInterval(this.timer);
      // 计算最终结果
      const endTime = new Date();
      this.totalTime = 60 - this.timeLeft;
      this.finalWPM = this.wpm;
      this.finalAccuracy = this.accuracy;
      // 保存到历史记录
      this.history.unshift({
        mode: this.gameModes.find(m => m.id === this.currentMode).name,
        difficulty: this.difficultyLevels.find(d => d.id === this.currentDifficulty).name,
        wpm: this.finalWPM,
        accuracy: this.finalAccuracy,
        timestamp: new Date()
      });
      // 限制历史记录数量
      if (this.history.length > 10) {
        this.history = this.history.slice(0, 10);
      }
      // 保存到localStorage
      localStorage.setItem('typingHistory', JSON.stringify(this.history));
      // 显示结果
      setTimeout(() => {
        this.showResult = true;
      }, 500);
    },
    // 重置游戏
    resetGame() {
      this.isPlaying = false;
      this.showStats = false;
      this.showResult = false;
      this.userInput = '';
      this.typedChars = [];
      this.correctCount = 0;
      this.errorCount = 0;
      this.currentWordIndex = 0;
      this.currentCharIndex = 0;
      this.timeLeft = 60;
      clearInterval(this.timer);
      if (this.currentMode === 'quote') {
        this.loadRandomQuote();
      } else {
        this.loadRandomWords();
      }
    },
    // 再玩一次
    playAgain() {
      this.showResult = false;
      this.resetGame();
      setTimeout(() => {
        this.startGame();
      }, 300);
    },
    // 关闭结果
    closeResult() {
      this.showResult = false;
    },
    // 获取字符类（段落模式）
    getCharClass(index) {
      if (index >= this.typedChars.length) {
        return 'char-default';
      }
      return this.typedChars[index].correct ? 'char-correct' : 'char-incorrect';
    },
    // 获取单词类（单词模式）
    getWordClass(wordIndex) {
      if (wordIndex < this.currentWordIndex) {
        return 'word-completed';
      } else if (wordIndex === this.currentWordIndex) {
        return 'word-current';
      } else {
        return 'word-upcoming';
      }
    },
    // 获取单词内字符类（单词模式）
    getWordCharClass(wordIndex, charIndex) {
      if (wordIndex < this.currentWordIndex) {
        return 'char-completed';
      } else if (wordIndex === this.currentWordIndex) {
        if (charIndex < this.currentCharIndex) {
          return 'char-completed';
        } else if (charIndex === this.currentCharIndex) {
          return 'char-current';
        } else {
          return 'char-upcoming';
        }
      } else {
        return 'char-upcoming';
      }
    },
    // 格式化日期
    formatDate(date) {
      return new Date(date).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    },
    // 格式化自定义计时器时间
    formatTime(seconds) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    },
    // 切换自定义计时器状态 (开始/暂停/继续)
    toggleCustomTimer() {
      // 定义音效链接（这里使用一个干净的点击音效，你可以换成自己的本地路径）
      const clickSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
      clickSound.volume = 0.5; // 设置音量 (0.0 到 1.0)
      clickSound.play();
      if (this.isCustomTimerRunning) {
        // 暂停
        clearInterval(this.customTimerInterval);
        this.isCustomTimerRunning = false;
      } else {
        // 开始或继续
        this.isCustomTimerRunning = true;
        this.customTimerInterval = setInterval(() => {
          this.customTimerValue++;
        }, 1000);
      }
    },
    // 重置自定义计时器
    resetCustomTimer() {
      clearInterval(this.customTimerInterval);
      this.customTimerValue = 0;
      this.isCustomTimerRunning = false;
    },
    // 打开自定义计时器菜单
    toggleTodoBox(event) {
      event.preventDefault(); // 阻止默认上下文菜单
      this.showTodoBox = !this.showTodoBox;
      // 如果待办事项框显示，尝试从 localStorage 加载
      if (this.showTodoBox) {
        this.loadTodoItems();
      } else {
        // 如果隐藏，清空输入框
        this.newTodoText = '';
      }
    },
    // 添加待办事项
    addTodoItem() {
      if (this.newTodoText.trim()) {
        this.todoItems.push(this.newTodoText.trim());
        this.newTodoText = ''; // 清空输入框
        this.saveTodoItems(); // 保存到 localStorage
      }
    },
    // 删除待办事项
    deleteTodoItem(index) {
      this.todoItems.splice(index, 1);
      this.saveTodoItems(); // 保存到 localStorage
    },
    // 保存待办事项到 localStorage
    saveTodoItems() {
      localStorage.setItem('todoList', JSON.stringify(this.todoItems));
    },
    // 从 localStorage 加载待办事项
    loadTodoItems() {
      const savedTodos = localStorage.getItem('todoList');
      if (savedTodos) {
        this.todoItems = JSON.parse(savedTodos);
      }
    },
    // 计时球拖拽开始
    startDrag(e) {
      this.isDragging = true;
      this.isJustClick = true;
      this.startX = e.clientX;
      this.startY = e.clientY;
      const rect = e.currentTarget.getBoundingClientRect();
      this.dragOffset.x = e.clientX - rect.left;
      this.dragOffset.y = e.clientY - rect.top;
      // 监听全局移动和松开事件
      document.addEventListener('mousemove', this.onDrag);
      document.addEventListener('mouseup', this.stopDrag);
    },
    // 计时球拖拽中
    onDrag(e) {
      if (!this.isDragging) return;
      const moveX = Math.abs(e.clientX - this.startX);
      const moveY = Math.abs(e.clientY - this.startY);
      if (moveX > this.dragThreshold || moveY > this.dragThreshold) {
        this.isJustClick = false;
      }
      const x = e.clientX - this.dragOffset.x;
      const y = e.clientY - this.dragOffset.y;
      this.ballPosition.right = window.innerWidth - x - 180; // 180是球宽
      this.ballPosition.top = y;
    },
    // 计时球拖拽结束
    stopDrag() {
      this.isDragging = false;
      if (this.isJustClick) {
        this.toggleCustomTimer();
      }
      document.removeEventListener('mousemove', this.onDrag);
      document.removeEventListener('mouseup', this.stopDrag);
    },
    // 核心修复：监听物理按键按下（event.code），绕开中文输入法
    handleKeyPress(event) {
      if (!this.isPlaying) return;
      this.pressedKeys.add(event.code);
    },
    // 核心修复：监听物理按键释放（event.code）
    handleKeyRelease(event) {
      this.pressedKeys.delete(event.code);
    },
    // 核心修复：判断物理按键是否按下，匹配虚拟键盘（兼容左右特殊键）
    isKeyPressed(key) {
      // 虚拟键盘键名 → 物理按键code 映射表（W3C标准）
      const keyToCode = {
        'A': 'KeyA', 'B': 'KeyB', 'C': 'KeyC', 'D': 'KeyD', 'E': 'KeyE', 'F': 'KeyF', 'G': 'KeyG',
        'H': 'KeyH', 'I': 'KeyI', 'J': 'KeyJ', 'K': 'KeyK', 'L': 'KeyL', 'M': 'KeyM', 'N': 'KeyN',
        'O': 'KeyO', 'P': 'KeyP', 'Q': 'KeyQ', 'R': 'KeyR', 'S': 'KeyS', 'T': 'KeyT', 'U': 'KeyU',
        'V': 'KeyV', 'W': 'KeyW', 'X': 'KeyX', 'Y': 'KeyY', 'Z': 'KeyZ',
        '0': 'Digit0', '1': 'Digit1', '2': 'Digit2', '3': 'Digit3', '4': 'Digit4', '5': 'Digit5',
        '6': 'Digit6', '7': 'Digit7', '8': 'Digit8', '9': 'Digit9',
        '`': 'Backquote', '-': 'Minus', '=': 'Equal', '[': 'BracketLeft', ']': 'BracketRight',
        '\\': 'Backslash', ';': 'Semicolon', "'": 'Quote', ',': 'Comma', '.': 'Period', '/': 'Slash',
        'Backspace': 'Backspace', 'Tab': 'Tab', 'CapsLock': 'CapsLock', 'Enter': 'Enter',
        'Shift': 'ShiftLeft', 'Ctrl': 'ControlLeft', 'Alt': 'AltLeft', 'Space': 'Space'
      };
      // 兼容左右侧特殊键（左/右Shift/Ctrl/Alt）
      const specialKeyMap = {
        'ShiftLeft': ['ShiftLeft', 'ShiftRight'],
        'ControlLeft': ['ControlLeft', 'ControlRight'],
        'AltLeft': ['AltLeft', 'AltRight']
      };
      const targetCode = keyToCode[key];
      if (!targetCode) return false;
      // 特殊键判断：左右任意一个按下即生效
      if (specialKeyMap[targetCode]) {
        return specialKeyMap[targetCode].some(code => this.pressedKeys.has(code));
      }
      // 普通键直接判断
      return this.pressedKeys.has(targetCode);
    },
    // 眼睛跟随-鼠标进入
    onBallMouseEnter() {
      this.isBallHover = true;
      this.eyeRotateAngle = 0;
      this.previousAngle = 0;
    },
    // 眼睛跟随-鼠标离开
    onBallMouseLeave() {
      this.isBallHover = false;
    },
    // 眼睛跟随-计算旋转角度
    calculateEyeFollow(e) {
      if (this.isBallHover || this.isDragging) return;
      const ball = document.querySelector('.custom-timer-icon');
      if (!ball) return;
      const ballRect = ball.getBoundingClientRect();
      const ballCenterX = ballRect.left + ballRect.width / 2;
      const ballCenterY = ballRect.top + ballRect.height / 2;
      const dx = e.clientX - ballCenterX;
      const dy = e.clientY - ballCenterY;
      let targetAngle = Math.atan2(dy, dx) * (180 / Math.PI) - 90;
      let angleDiff = targetAngle - this.previousAngle;
      if (angleDiff > 180) angleDiff -= 360;
      else if (angleDiff < -180) angleDiff += 360;
      this.eyeRotateAngle = this.previousAngle + angleDiff;
      this.previousAngle = this.eyeRotateAngle;
    }
  },
  mounted() {
    // 加载历史记录
    const savedHistory = localStorage.getItem('typingHistory');
    if (savedHistory) {
      this.history = JSON.parse(savedHistory);
    }
    // 初始化游戏内容
    this.loadRandomQuote();
    this.loadRandomWords();
    // 监听全局按键
    document.addEventListener('keydown', this.handleKeyDown);
    // 监听物理键盘按下/释放（核心修复）
    document.addEventListener('keydown', this.handleKeyPress);
    document.addEventListener('keyup', this.handleKeyRelease);
    // 监听鼠标移动-眼睛跟随
    document.addEventListener('mousemove', this.calculateEyeFollow);
  },
  beforeUnmount() {
    // 移除全局监听
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keydown', this.handleKeyPress);
    document.removeEventListener('keyup', this.handleKeyRelease);
    document.removeEventListener('mousemove', this.calculateEyeFollow);
    // 清除定时器
    clearInterval(this.timer);
    clearInterval(this.customTimerInterval);
  }
};
</script>

<style scoped>
.typing-game {
  background: rgba(25, 25, 35, 0.9);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  margin-top: 20px;
}

.game-header {
  text-align: center;
  margin-bottom: 30px;
}

.game-header h1 {
  font-family: 'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 20px;
  background: linear-gradient(90deg, #ff7e5f, #f2f2f2);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.game-header h1:hover {
  text-shadow: 0 0 20px rgba(255, 126, 95, 0.8);
  transform: scale(1.03);
}

.difficulty-selector {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 15px;
}

.difficulty-selector button {
  padding: 8px 20px;
  border: none;
  border-radius: 20px;
  background: #2d2d44;
  color: #aaa;
  cursor: pointer;
  transition: all 0.3s;
}

.difficulty-selector button.active {
  background: linear-gradient(90deg, #4a54e1, #15d8d8);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(74, 84, 225, 0.3);
}

.game-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  background: rgba(255, 255, 255, 0.05);
  padding: 20px;
  border-radius: 15px;
}

.mode-selector {
  display: flex;
  gap: 10px;
}

.mode-selector button {
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  background: #2d2d44;
  color: #aaa;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
}

.mode-selector button.active {
  background: linear-gradient(90deg, #8a2387, #e94057, #f27121);
  color: white;
  transform: translateY(-2px);
}

.control-buttons {
  display: flex;
  gap: 15px;
}

.control-buttons button {
  padding: 12px 25px;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s;
}

.btn-start {
  background: linear-gradient(90deg, #00b09b, #96c93d);
  color: white;
}

.btn-start:disabled {
  background: #555;
  cursor: not-allowed;
  transform: none !important;
}

.btn-reset {
  background: linear-gradient(90deg, #ff416c, #ff4b2b);
  color: white;
}

.control-buttons button:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 7px 20px rgba(0, 0, 0, 0.2);
}

.stats-container {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 15px;
  margin-bottom: 30px;
}

.stat-box {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 0.9rem;
  color: #aaa;
}

.game-area {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 15px;
  padding: 25px;
  margin-bottom: 25px;
}

.quote-display {
  font-size: 1.4rem;
  line-height: 1.8;
  margin-bottom: 25px;
  min-height: 120px;
  background: rgba(0, 0, 0, 0.2);
  padding: 20px;
  border-radius: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.words-display {
  font-size: 1.4rem;
  line-height: 1.8;
  margin-bottom: 25px;
  min-height: 120px;
  background: rgba(0, 0, 0, 0.2);
  padding: 20px;
  border-radius: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.word {
  display: inline-flex;
  gap: 2px;
}

.char-default {
  color: #ccc;
}

.char-correct {
  color: #4CAF50;
  text-decoration: underline;
}

.char-incorrect {
  color: #f44336;
  text-decoration: underline wavy #f44336;
}

.word-completed {
  color: #4CAF50;
}

.word-current {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 5px;
}

.word-upcoming {
  color: #888;
}

.char-completed {
  color: #4CAF50;
}

.char-current {
  background: #4a54e1;
  color: white;
  padding: 0 2px;
  border-radius: 3px;
}

.char-upcoming {
  color: #888;
}

.typing-input {
  width: 100%;
  padding: 20px;
  font-size: 1.2rem;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: white;
  resize: none;
  outline: none;
  transition: border-color 0.3s;
}

.typing-input:focus {
  border-color: #4a54e1;
}

.typing-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.progress-container {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  margin: 30px 0;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #00b09b, #96c93d);
  transition: width 1s linear;
}

.history-section {
  margin-top: 40px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  padding: 20px;
}

.history-section h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  color: #4a54e1;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  transition: all 0.3s;
}

.history-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(5px);
}

.history-item span {
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 0.9rem;
}

.history-item .mode {
  background: rgba(138, 35, 135, 0.3);
  color: #e94057;
}

.history-item .difficulty {
  background: rgba(74, 84, 225, 0.3);
  color: #15d8d8;
}

.history-item .wpm {
  background: rgba(0, 176, 155, 0.3);
  color: #96c93d;
  font-weight: bold;
}

.history-item .accuracy {
  background: rgba(255, 65, 108, 0.3);
  color: #ff4b2b;
}

.history-item .date {
  color: #aaa;
  font-size: 0.8rem;
}

.result-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal-content {
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  padding: 40px;
  border-radius: 20px;
  max-width: 500px;
  width: 90%;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.modal-content h2 {
  font-size: 2rem;
  margin-bottom: 30px;
  color: #4a54e1;
}

.result-stats {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-bottom: 30px;
}

.result-stat {
  text-align: center;
}

.result-value {
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 5px;
}

.result-value:first-child {
  color: #00b09b;
}

.result-value:last-child {
  color: #ff416c;
}

.result-label {
  font-size: 1rem;
  color: #aaa;
}

.result-details {
  text-align: left;
  background: rgba(255, 255, 255, 0.05);
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 30px;
}

.result-details p {
  margin: 10px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-buttons {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.modal-buttons button {
  padding: 12px 30px;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s;
}

.btn-play-again {
  background: linear-gradient(90deg, #00b09b, #96c93d);
  color: white;
}

.btn-close {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.modal-buttons button:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}

.hotkey-hint {
  margin-top: 30px;
  text-align: center;
  color: #aaa;
  font-size: 0.9rem;
}

.hotkey-hint kbd {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stats-container {
    grid-template-columns: repeat(3, 1fr);
  }

  .game-controls {
    flex-direction: column;
    gap: 20px;
  }

  .mode-selector {
    flex-wrap: wrap;
    justify-content: center;
  }

  .history-item {
    flex-wrap: wrap;
    gap: 10px;
  }

  .history-item span {
    flex: 1;
    text-align: center;
    min-width: 100px;
  }

  .quote-display, .words-display {
    font-size: 1.1rem;
  }
}

@media (max-width: 480px) {
  .stats-container {
    grid-template-columns: repeat(2, 1fr);
  }

  .game-header h1 {
    font-size: 1.8rem;
    flex-direction: column;
    gap: 5px;
  }

  .result-stats {
    flex-direction: column;
    gap: 20px;
  }
}

/* 自定义计时器图标样式 */
.custom-timer-icon {
  position: fixed;
  user-select: none;
  touch-action: none;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: white;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  cursor: pointer;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  gap: 10px;
  overflow: hidden;
}

/* 双眼容器 */
.eyes-container {
  display: flex;
  gap: 25px;
  align-items: center;
  justify-content: center;
}

/* 眼睛样式 */
.eye {
  width: 40px;
  height: 40px;
  background: #fff;
  border-radius: 50%;
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 2px 3px rgba(0, 0, 0, 0.2);
}

/* 眼珠容器 */
.pupil {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform-origin: center center;
  transition: transform 0.1s ease-out;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 眼珠核心 */
.pupil-core {
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 18px;
  height: 18px;
  background: #000;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* 计时器显示 */
.custom-timer-icon .timer-display {
  font-size: 1rem;
  font-weight: bold;
  background: rgba(0, 0, 0, 0.2);
  padding: 4px 12px;
  border-radius: 12px;
  backdrop-filter: blur(5px);
}

/* 待办事项框样式 */
.todo-box {
  position: absolute;
  right: 200px;
  top: 50%;
  transform: translateY(-50%);
  width: 280px;
  max-height: 400px;
  background: rgba(30, 30, 45, 0.95);
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
  color: #eee;
  display: flex;
  flex-direction: column;
  gap: 15px;
  z-index: 999;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.todo-box h3 {
  margin: 0 0 10px 0;
  color: #fff;
  font-size: 1.3rem;
  text-align: center;
  background: linear-gradient(90deg, #00b09b, #96c93d);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.todo-input-group {
  display: flex;
  gap: 10px;
}

.todo-input-group input {
  flex-grow: 1;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #444;
  background: #2d2d44;
  color: #eee;
  font-size: 0.95rem;
  outline: none;
}

.todo-input-group input::placeholder {
  color: #888;
}

.todo-input-group button {
  padding: 10px 15px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(90deg, #00b09b, #96c93d);
  color: white;
  cursor: pointer;
  transition: background 0.3s ease;
}

.todo-input-group button:hover {
  background: linear-gradient(90deg, #96c93d, #00b09b);
}

.todo-input-group button:disabled {
  background: #555;
  cursor: not-allowed;
}

.todo-list {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  max-height: 200px;
}

.todo-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  padding: 10px 15px;
  border-radius: 8px;
  margin-bottom: 8px;
  font-size: 0.95rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.todo-list li:last-child {
  margin-bottom: 0;
}

.todo-list li span {
  flex-grow: 1;
  margin-right: 10px;
  word-break: break-word;
}

.todo-list li button {
  background: linear-gradient(90deg, #ff416c, #ff4b2b);
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.3s ease;
}

.todo-list li button:hover {
  background: linear-gradient(90deg, #ff4b2b, #ff416c);
}

.no-todos {
  text-align: center;
  color: #888;
  font-style: italic;
  padding: 10px;
}

/* 虚拟键盘样式 */
.virtual-keyboard {
  position: fixed;
  right: 30px;
  bottom: 30px;
  background: rgba(30, 30, 45, 0.95);
  padding: 20px;
  border-radius: 15px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 500;
}

.keyboard-row {
  display: flex;
  gap: 5px;
  margin-bottom: 5px;
  justify-content: center;
}

.keyboard-row:last-child {
  margin-bottom: 0;
}

.keyboard-key {
  min-width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ccc;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.1s ease;
  user-select: none;
}

.keyboard-key.key-special {
  min-width: 60px;
  font-size: 0.7rem;
}

.keyboard-key.key-space {
  min-width: 200px;
}

.keyboard-key.key-pressed {
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: white;
  transform: translateY(2px);
  box-shadow: 0 0 15px rgba(106, 17, 203, 0.6);
  border-color: rgba(37, 117, 252, 0.8);
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .virtual-keyboard {
    right: 10px;
    bottom: 10px;
    transform: scale(0.8);
    transform-origin: bottom right;
  }
}

@media (max-width: 768px) {
  .virtual-keyboard {
    display: none; /* 小屏幕隐藏 */
  }
}
</style>