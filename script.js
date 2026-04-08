let currentSection = 1;
const totalSections = 4;
let answers = {};
let studentId = '';
const questionsPerSection = 30;

// Load questions from JSON file
let questionsData = {};

// Load questions from external file
async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        questionsData = await response.json();
        console.log('Questions loaded successfully');
    } catch (error) {
        console.error('Error loading questions:', error);
        // Fallback to empty data
        questionsData = {
            listening: [],
            speaking: [],
            reading: [],
            writing: []
        };
    }
}

// Generate questions for each section
async function generateQuestions() {
    await loadQuestions();

    // Section 1: Listening
    questionsData.listening.forEach((q, index) => {
        const qNum = index + 1;
        questionsData[1] = questionsData[1] || [];
        questionsData[1].push({
            id: `q${qNum}`,
            question: `Question ${qNum}: ${q.question}`,
            options: q.options,
            correct: q.correct,
            audio: q.audio
        });
    });

    // Section 2: Speaking
    questionsData.speaking.forEach((q, index) => {
        const qNum = index + 1 + questionsPerSection;
        questionsData[2] = questionsData[2] || [];
        questionsData[2].push({
            id: `q${qNum}`,
            question: `Question ${qNum - questionsPerSection}: ${q.question}`,
            options: q.options,
            correct: q.correct
        });
    });

    // Section 3: Reading
    questionsData.reading.forEach((q, index) => {
        const qNum = index + 1 + (questionsPerSection * 2);
        questionsData[3] = questionsData[3] || [];
        questionsData[3].push({
            id: `q${qNum}`,
            question: `Question ${qNum - (questionsPerSection * 2)}: ${q.question}`,
            options: q.options,
            correct: q.correct
        });
    });

    // Section 4: Writing
    questionsData.writing.forEach((q, index) => {
        const qNum = index + 1 + (questionsPerSection * 3);
        questionsData[4] = questionsData[4] || [];
        questionsData[4].push({
            id: `q${qNum}`,
            question: `Question ${qNum - (questionsPerSection * 3)}: ${q.question}`,
            options: q.options,
            correct: q.correct
        });
    });
}

// Render questions for a section

function getListeningOptions(num) {
    const optionSets = [
        ["A) The location of the nearest bank", "B) Directions to the train station", "C) The time of the next bus", "D) Information about parking"],
        ["A) Go to a movie", "B) Have dinner at a restaurant", "C) Visit a museum", "D) Play sports"],
        ["A) Sunny and warm", "B) Rainy and cold", "C) Cloudy with wind", "D) Snowy"],
        ["A) Pasta", "B) Steak", "C) Fish", "D) Chicken"],
        ["A) Open their books", "B) Write their names", "C) Stand up", "D) Close their eyes"],
        ["A) Monday morning", "B) Tuesday afternoon", "C) Wednesday evening", "D) Thursday morning"],
        ["A) Two bedrooms", "B) Three bedrooms", "C) Four bedrooms", "D) Five bedrooms"],
        ["A) Main Street", "B) Highway 5", "C) Oak Avenue", "D) River Road"],
        ["A) Next Monday", "B) Next Friday", "C) Next week", "D) Tomorrow"],
        ["A) One ticket", "B) Two tickets", "C) Three tickets", "D) Four tickets"],
        ["A) Spicy food", "B) Exercise", "C) Coffee", "D) Reading"],
        ["A) The museum", "B) The park", "C) The cathedral", "D) The market"],
        ["A) 6:00 PM", "B) 7:00 PM", "C) 7:30 PM", "D) 8:00 PM"],
        ["A) Clothes", "B) Books", "C) Groceries", "D) Electronics"],
        ["A) Excellent", "B) Good", "C) Average", "D) Poor"],
        ["A) Watch TV", "B) Eat candy", "C) Play outside", "D) Read books"],
        ["A) By car", "B) By train", "C) By plane", "D) By bus"],
        ["A) Painting", "B) Cooking", "C) Gardening", "D) Photography"],
        ["A) Slow service", "B) High prices", "C) Poor quality", "D) Wrong order"],
        ["A) Cars", "B) Computers", "C) Food", "D) Clothing"],
        ["A) At the café", "B) At the park", "C) At the library", "D) At home"],
        ["A) Spicy food", "B) Vegetables", "C) Meat", "D) Sweets"],
        ["A) Left", "B) Right", "C) Straight", "D) Back"],
        ["A) Mystery", "B) Romance", "C) Science fiction", "D) Biography"],
        ["A) Teacher", "B) Doctor", "C) Engineer", "D) Lawyer"],
        ["A) Basketball", "B) Tennis", "C) Soccer", "D) Swimming"],
        ["A) Headache", "B) Stomach pain", "C) Back pain", "D) Toothache"],
        ["A) 15°C", "B) 20°C", "C) 25°C", "D) 30°C"],
        ["A) Small", "B) Medium", "C) Large", "D) Extra large"],
        ["A) Paris", "B) London", "C) Rome", "D) Berlin"]
    ];
    return optionSets[num - 1] || ["A) Option A", "B) Option B", "C) Option C", "D) Option D"];
}

function getListeningAnswer(num) {
    const answers = ['B', 'B', 'A', 'D', 'B', 'B', 'B', 'A', 'B', 'C', 'A', 'C', 'B', 'C', 'A', 'B', 'B', 'C', 'A', 'B', 'A', 'A', 'B', 'C', 'B', 'C', 'B', 'C', 'C', 'A'];
    return answers[num - 1] || 'A';
}

function getSpeakingQuestion(num) {
    const questions = [
        "Describe your favorite hobby and explain why you enjoy it.",
        "If you could travel anywhere right now, where would you go and why?",
        "Describe a person who has influenced your life positively.",
        "What are the advantages and disadvantages of living in a big city?",
        "Describe your daily routine from morning to evening.",
        "If you won the lottery, what would you do with the money?",
        "Describe a memorable event from your childhood.",
        "What are some important qualities for being a good friend?",
        "Describe your favorite season and explain why you like it.",
        "If you could have dinner with any historical figure, who would it be?",
        "Describe a skill you would like to learn and why.",
        "What are the benefits of learning a foreign language?",
        "Describe your ideal job and explain why it appeals to you.",
        "What are some ways to reduce stress in daily life?",
        "Describe a place you have visited that you would recommend to others.",
        "If you could change one thing about the world, what would it be?",
        "Describe your favorite type of music and why you enjoy it.",
        "What are some challenges of modern technology?",
        "Describe a book or movie that had a big impact on you.",
        "If you could time travel, which era would you visit?",
        "Describe the importance of environmental protection.",
        "What are some healthy eating habits you follow?",
        "Describe your family and how you spend time together.",
        "If you could invent something, what would it be?",
        "Describe the role of education in society.",
        "What are some ways to stay motivated when learning?",
        "Describe a difficult decision you had to make.",
        "If you could have any superpower, what would it be?",
        "Describe the importance of physical exercise.",
        "What are your plans for the future?"
    ];
    return questions[num - 1] || `Speaking Question ${num}`;
}

function getSpeakingOptions(num) {
    // For speaking questions, we'll use multiple choice questions about grammar/pronunciation
    const questions = [
        "Choose the correct pronunciation: 'Schedule' is pronounced as:",
        "Which sentence has the correct word order?",
        "Choose the correct past tense form: 'I ___ to the store yesterday.'",
        "Which option shows correct subject-verb agreement?",
        "Choose the correct preposition: 'I live ___ New York.'",
        "Which sentence uses the correct article?",
        "Choose the correct comparative form: 'This book is ___ than that one.'",
        "Which option shows correct plural formation?",
        "Choose the correct modal verb: 'You ___ smoke here.'",
        "Which sentence has the correct question form?",
        "Choose the correct tense: 'I ___ English for 5 years.'",
        "Which option shows correct adjective order?",
        "Choose the correct phrasal verb: 'Please ___ the light.'",
        "Which sentence uses the correct conditional?",
        "Choose the correct pronoun: 'This is my book. It is ___.'",
        "Which option shows correct passive voice?",
        "Choose the correct idiom: 'It's raining ___. We should stay inside.'",
        "Which sentence has the correct reported speech?",
        "Choose the correct gerund or infinitive: 'I enjoy ___.'",
        "Which option shows correct punctuation?",
        "Choose the correct collocation: 'Make ___ decision.'",
        "Which sentence uses the correct relative clause?",
        "Choose the correct phrasal verb: 'I need to ___ this problem.'",
        "Which option shows correct word formation?",
        "Choose the correct preposition: 'I'm interested ___ music.'",
        "Which sentence has the correct tag question?",
        "Choose the correct modal verb: '___ I help you?'",
        "Which option shows correct sentence structure?",
        "Choose the correct synonym: 'Happy' means the same as:",
        "Choose the correct preposition: 'The book is ___ the table.'"
    ];
    
    const optionSets = [
        ["A) /ˈskedʒul/", "B) /ˈʃedjuːl/", "C) /ˈskedjuːl/", "D) /ˈʃedʒul/"],
        ["A) I yesterday went to school.", "B) I went to school yesterday.", "C) Yesterday I went to school.", "D) Went I to school yesterday."],
        ["A) go", "B) went", "C) going", "D) gone"],
        ["A) She like apples.", "B) She likes apples.", "C) She liking apples.", "D) She liked apples."],
        ["A) at", "B) on", "C) in", "D) with"],
        ["A) I saw a elephant.", "B) I saw an elephant.", "C) I saw the elephant.", "D) I saw elephant."],
        ["A) good", "B) better", "C) best", "D) gooder"],
        ["A) childs", "B) childrens", "C) children", "D) childes"],
        ["A) can", "B) may", "C) must", "D) should"],
        ["A) What you are doing?", "B) What are you doing?", "C) Are you doing what?", "D) Doing what are you?"],
        ["A) learn", "B) learned", "C) have learned", "D) am learning"],
        ["A) big red house", "B) red big house", "C) house big red", "D) red house big"],
        ["A) turn on", "B) turn off", "C) turn up", "D) turn down"],
        ["A) If I will study, I pass.", "B) If I study, I will pass.", "C) If I studied, I pass.", "D) If I will study, I would pass."],
        ["A) mine", "B) my", "C) me", "D) I"],
        ["A) The cake was ate by me.", "B) The cake was eaten by me.", "C) I was eat the cake.", "D) I was eaten the cake."],
        ["A) cats and dogs", "B) cats or dogs", "C) cats and cats", "D) dogs and dogs"],
        ["A) He said me he was tired.", "B) He said that he was tired.", "C) He said I he was tired.", "D) He said that I was tired."],
        ["A) swim", "B) swimming", "C) to swim", "D) swam"],
        ["A) I like pizza, and burgers.", "B) I like pizza and burgers.", "C) I like pizza, and, burgers.", "D) I like pizza and, burgers."],
        ["A) a", "B) an", "C) the", "D) no article"],
        ["A) The man who lives next door is a doctor.", "B) The man which lives next door is a doctor.", "C) The man whom lives next door is a doctor.", "D) The man where lives next door is a doctor."],
        ["A) figure out", "B) figure in", "C) figure up", "D) figure at"],
        ["A) unhappy", "B) unhappily", "C) happiness", "D) happier"],
        ["A) at", "B) in", "C) on", "D) with"],
        ["A) You like pizza, don't you?", "B) You like pizza, do you?", "C) You like pizza, isn't it?", "D) You like pizza, aren't you?"],
        ["A) Can", "B) May", "C) Must", "D) Should"],
        ["A) Subject + verb + object", "B) Object + subject + verb", "C) Verb + subject + object", "D) Subject + object + verb"],
        ["A) sad", "B) glad", "C) angry", "D) tired"],
        ["A) in", "B) on", "C) at", "D) under"]
    ];
    
    return optionSets[num - 1] || ["A) Option A", "B) Option B", "C) Option C", "D) Option D"];
}

function getSpeakingAnswer(num) {
    const answers = ['B', 'B', 'B', 'B', 'C', 'B', 'B', 'C', 'A', 'B', 'C', 'A', 'A', 'B', 'A', 'A', 'A', 'B', 'B', 'B', 'A', 'A', 'A', 'A', 'B', 'A', 'A', 'A', 'A', 'B'];
    return answers[num - 1] || 'A';
}

function getReadingQuestion(num) {
    const questions = [
        "What is the main idea of the passage?",
        "According to the text, what is the author's opinion about technology?",
        "Which of the following is NOT mentioned in the passage?",
        "What can be inferred from the second paragraph?",
        "What is the purpose of the article?",
        "Which statement best summarizes the passage?",
        "What does the word 'sustainable' mean in the context?",
        "According to the text, what are the benefits of exercise?",
        "What is the author's main argument?",
        "Which of these would be the best title for the passage?",
        "What does the passage suggest about climate change?",
        "According to the text, what should people do to stay healthy?",
        "What is the relationship between the first and second paragraphs?",
        "Which of the following is supported by evidence in the text?",
        "What is the tone of the passage?",
        "What does the author mean by 'digital divide'?",
        "According to the passage, what is the most important factor for success?",
        "What can be concluded from the information provided?",
        "Which of these statements contradicts the passage?",
        "What is the author's attitude toward social media?",
        "According to the passage, what are the effects of pollution?",
        "What does the passage imply about education?",
        "Which of the following is a fact stated in the text?",
        "What is the main problem discussed in the passage?",
        "According to the author, what is the solution to the issue?",
        "What does the word 'innovative' mean in this context?",
        "Which of these is an example given in the text?",
        "What is the author's purpose in writing this passage?",
        "According to the passage, what has changed over time?",
        "What does the text suggest about the future?"
    ];
    return questions[num - 1] || `Reading Question ${num}`;
}

function getReadingOptions(num) {
    const optionSets = [
        ["A) The history of computers", "B) The impact of technology on society", "C) How to use smartphones", "D) The future of artificial intelligence"],
        ["A) It has made life easier", "B) It should be avoided", "C) It has both positive and negative effects", "D) It is not important"],
        ["A) Social media", "B) Email", "C) Video calls", "D) Teleportation"],
        ["A) Technology will continue to advance", "B) People prefer face-to-face communication", "C) Digital communication is decreasing", "D) Social skills are improving"],
        ["A) To entertain readers", "B) To inform about current trends", "C) To persuade people to change habits", "D) To describe personal experiences"],
        ["A) Technology has completely changed communication", "B) People should stop using digital devices", "C) Face-to-face communication is better", "D) Social media has no impact on society"],
        ["A) Environmentally friendly", "B) Long-lasting", "C) Expensive", "D) Modern"],
        ["A) Improved physical health", "B) Better sleep", "C) Increased energy", "D) All of the above"],
        ["A) Technology improves communication", "B) Social media is harmful", "C) People should use less technology", "D) Digital communication enhances relationships"],
        ["A) The Rise of Digital Communication", "B) Why Technology is Bad", "C) The Future of Social Media", "D) How to Use Smartphones"],
        ["A) It is not happening", "B) It is a serious problem", "C) It only affects animals", "D) It will be solved soon"],
        ["A) Eat healthy food", "B) Exercise regularly", "C) Get enough sleep", "D) All of the above"],
        ["A) They contradict each other", "B) The second explains the first", "C) They are unrelated", "D) The first supports the second"],
        ["A) Technology has improved communication", "B) People never talk face-to-face", "C) Social media is always negative", "D) People prefer texting over talking"],
        ["A) Positive", "B) Negative", "C) Neutral", "D) Humorous"],
        ["A) The gap between rich and poor countries", "B) The difference between old and new technology", "C) The separation between work and home life", "D) The divide between men and women online"],
        ["A) Hard work", "B) Luck", "C) Education", "D) Money"],
        ["A) Technology will continue to grow", "B) People will stop using social media", "C) Communication will return to traditional methods", "D) Digital and face-to-face communication will coexist"],
        ["A) Social media helps people stay connected", "B) Technology has no impact on society", "C) Face-to-face communication is disappearing", "D) People prefer texting over talking"],
        ["A) Positive", "B) Negative", "C) Neutral", "D) Mixed"],
        ["A) Cleaner air", "B) Health problems", "C) Better economy", "D) More wildlife"],
        ["A) It is not important", "B) It should be free for everyone", "C) It helps people succeed", "D) It is becoming less valuable"],
        ["A) Technology improves life", "B) Social media is popular", "C) People use smartphones daily", "D) Communication has changed"],
        ["A) Lack of technology", "B) Too much screen time", "C) Poor communication skills", "D) Environmental issues"],
        ["A) Use less technology", "B) Balance digital and face-to-face communication", "C) Stop using social media", "D) Return to traditional communication"],
        ["A) New and creative", "B) Old-fashioned", "C) Expensive", "D) Difficult"],
        ["A) Email", "B) Video calls", "C) Text messaging", "D) All of the above"],
        ["A) To inform readers about technology", "B) To persuade people to use more technology", "C) To discuss the impact of digital communication", "D) To entertain with stories"],
        ["A) Communication methods", "B) People's habits", "C) Technology availability", "D) All of the above"],
        ["A) More technology use", "B) Less digital communication", "C) Balance between digital and traditional methods", "D) Complete elimination of social media"]
    ];
    return optionSets[num - 1] || ["A) Option A", "B) Option B", "C) Option C", "D) Option D"];
}

function getReadingAnswer(num) {
    const answers = ['B', 'C', 'D', 'A', 'B', 'A', 'A', 'D', 'A', 'A', 'B', 'D', 'B', 'A', 'C', 'A', 'A', 'A', 'B', 'D', 'B', 'C', 'D', 'B', 'B', 'A', 'D', 'C', 'D', 'C'];
    return answers[num - 1] || 'A';
}

function getWritingQuestion(num) {
    const questions = [
        "Choose the correct sentence structure: 'She ___ to the store yesterday.'",
        "Which word is spelled correctly?",
        "Choose the correct preposition: 'I am interested ___ learning English.'",
        "Which sentence has the correct punctuation?",
        "Choose the correct verb tense: 'I ___ English since 2010.'",
        "Which word is a synonym for 'happy'?",
        "Choose the correct article: '___ apple a day keeps the doctor away.'",
        "Which sentence is grammatically correct?",
        "Choose the correct word order: 'I usually ___ breakfast at 7 AM.'",
        "Which of these is a proper noun?",
        "Choose the correct comparative form: 'This test is ___ than the last one.'",
        "Which word is an adjective?",
        "Choose the correct modal verb: 'You ___ study harder to pass the exam.'",
        "Which sentence uses the correct passive voice?",
        "Choose the correct pronoun: 'This book belongs to me. It is ___.'",
        "Which word is a conjunction?",
        "Choose the correct plural form: 'One child, two ___.'",
        "Which sentence has the correct subject-verb agreement?",
        "Choose the correct phrasal verb: 'Please ___ the volume on the TV.'",
        "Which word is an adverb?",
        "Choose the correct conditional: 'If I ___ rich, I would travel the world.'",
        "Which of these is a compound sentence?",
        "Choose the correct idiom: 'It's raining ___, so we can't go outside.'",
        "Which word is a preposition?",
        "Choose the correct relative pronoun: 'The man ___ lives next door is a doctor.'",
        "Which sentence uses the correct reported speech?",
        "Choose the correct gerund: 'I enjoy ___ in my free time.'",
        "Which of these shows correct capitalization?",
        "Choose the correct collocation: 'Make ___ mistake.'",
        "Which sentence has the correct question form?",
        "Choose the correct preposition: 'I agree ___ you completely.'"
    ];
    return questions[num - 1] || `Writing Question ${num}`;
}

function getWritingOptions(num) {
    const optionSets = [
        ["A) go", "B) went", "C) going", "D) gone"],
        ["A) recieve", "B) receive", "C) recive", "D) receeve"],
        ["A) at", "B) in", "C) on", "D) with"],
        ["A) I like pizza, and burgers.", "B) I like pizza and burgers.", "C) I like pizza, and, burgers.", "D) I like pizza and, burgers."],
        ["A) learn", "B) learned", "C) have learned", "D) am learning"],
        ["A) sad", "B) glad", "C) angry", "D) tired"],
        ["A) A", "B) An", "C) The", "D) No article"],
        ["A) She don't like apples.", "B) She doesn't likes apples.", "C) She doesn't like apples.", "D) She don't likes apples."],
        ["A) eat", "B) eats", "C) eating", "D) eaten"],
        ["A) book", "B) London", "C) happy", "D) running"],
        ["A) harder", "B) more hard", "C) hardest", "D) hard"],
        ["A) run", "B) quickly", "C) beautiful", "D) table"],
        ["A) can", "B) may", "C) must", "D) should"],
        ["A) The cake was ate by me.", "B) The cake was eaten by me.", "C) I was eat the cake.", "D) I was eaten the cake."],
        ["A) mine", "B) my", "C) me", "D) I"],
        ["A) and", "B) quickly", "C) beautiful", "D) running"],
        ["A) childs", "B) childrens", "C) children", "D) childes"],
        ["A) The students was studying.", "B) The students were studying.", "C) The student were studying.", "D) The students is studying."],
        ["A) turn on", "B) turn off", "C) turn up", "D) turn down"],
        ["A) quick", "B) quickly", "C) beauty", "D) run"],
        ["A) am", "B) was", "C) were", "D) be"],
        ["A) I like pizza.", "B) I like pizza and I like burgers.", "C) I like pizza, but I don't like burgers.", "D) Because I like pizza."],
        ["A) cats and dogs", "B) cats or dogs", "C) cats and cats", "D) dogs and dogs"],
        ["A) quickly", "B) beautiful", "C) and", "D) in"],
        ["A) who", "B) which", "C) where", "D) whom"],
        ["A) He said me he was tired.", "B) He said that he was tired.", "C) He said I he was tired.", "D) He said that I was tired."],
        ["A) read", "B) reading", "C) to read", "D) reads"],
        ["A) i love english", "B) I love English", "C) i Love english", "D) I love english"],
        ["A) a", "B) an", "C) the", "D) no article"],
        ["A) What you are doing?", "B) What are you doing?", "C) Are you doing what?", "D) Doing what are you?"],
        ["A) to", "B) with", "C) at", "D) on"]
    ];
    return optionSets[num - 1] || ["A) Option A", "B) Option B", "C) Option C", "D) Option D"];
}

function getWritingAnswer(num) {
    const answers = ['B', 'B', 'B', 'A', 'C', 'B', 'B', 'C', 'A', 'B', 'A', 'C', 'C', 'B', 'A', 'A', 'C', 'B', 'D', 'B', 'C', 'C', 'A', 'D', 'A', 'B', 'B', 'B', 'A', 'B'];
    return answers[num - 1] || 'A';
}

// Render questions for a section
function renderSection(sectionNum) {
    const sectionEl = document.getElementById(`sec-${sectionNum}`);
    const questionsHtml = questionsData[sectionNum].map((q, index) => {
        const questionNum = index + 1;
        let audioHtml = '';

        // Add audio controls for listening section
        if (sectionNum === 1 && q.audio) {
            audioHtml = `
                <div class="audio-controls" style="margin-bottom: 15px; padding: 10px; background-color: #f8fafc; border-radius: 5px; border: 1px solid #e6f0ff;">
                    <p style="margin: 0 0 10px 0; font-weight: bold; color: #001f3f;">Listen to the audio:</p>
                    <audio controls style="width: 100%;">
                        <source src="${q.audio}" type="audio/mpeg">
                        <source src="${q.audio.replace('.mp3', '.wav')}" type="audio/wav">
                        Your browser does not support the audio element.
                    </audio>
                    <p style="margin: 10px 0 0 0; font-size: 14px; color: #64748b;">Click play to listen, then answer the question below.</p>
                </div>
            `;
        }

        return `
        <div class="question">
            ${audioHtml}
            <p>${q.question}</p>
            <div class="options">
                ${q.options.map((option, optIndex) => {
                    const value = String.fromCharCode(65 + optIndex); // A, B, C, D
                    const checked = answers[q.id] === value ? 'checked' : '';
                    return `<label><input type="radio" name="${q.id}" value="${value}" ${checked}> ${option}</label><br>`;
                }).join('')}
            </div>
        </div>
    `}).join('');

    sectionEl.innerHTML = `<h3>Section ${sectionNum}: ${getSectionTitle(sectionNum)}</h3>${questionsHtml}`;
}

function getSectionTitle(sectionNum) {
    const titles = {
        1: "Listening",
        2: "Speaking", 
        3: "Reading",
        4: "Writing"
    };
    return titles[sectionNum] || `Section ${sectionNum}`;
}

// Load answers from localStorage if available
function loadAnswers() {
    const saved = localStorage.getItem('exam_answers');
    if (saved) {
        answers = JSON.parse(saved);
        // Restore selected radio buttons
        Object.keys(answers).forEach(question => {
            const radio = document.querySelector(`input[name="${question}"][value="${answers[question]}"]`);
            if (radio) radio.checked = true;
        });
    }
}

// Save answers to localStorage
function saveAnswers() {
    localStorage.setItem('exam_answers', JSON.stringify(answers));
}

// Collect answers from current section
function collectAnswers() {
    const currentSectionEl = document.getElementById(`sec-${currentSection}`);
    const radios = currentSectionEl.querySelectorAll('input[type="radio"]:checked');
    radios.forEach(radio => {
        answers[radio.name] = radio.value;
    });
}

// Initialize questions on page load
document.addEventListener('DOMContentLoaded', async function() {
    await generateQuestions();
    renderSection(1); // Render first section
});

// 1. Handle Login
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    studentId = document.getElementById('student-id').value;
    
    // Switch UI
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('exam-container').classList.remove('hidden');
    document.getElementById('student-display').innerText += studentId;
    
    loadAnswers(); // Load any previously saved answers
    startTimer(30); // Start a 30-minute timer
});

// 2. Navigation Logic
function goToSection(secNum) {
    collectAnswers(); // Save current answers before switching
    saveAnswers(); // Persist to localStorage
    
    // Hide all sections
    document.querySelectorAll('.exam-section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    // Show selected and render questions
    document.getElementById(`sec-${secNum}`).classList.remove('hidden');
    document.querySelectorAll('.nav-tab')[secNum - 1].classList.add('active');
    
    currentSection = secNum;
    renderSection(secNum); // Render questions for this section
    updateButtons();
}

function move(step) {
    let target = currentSection + step;
    if (target >= 1 && target <= totalSections) {
        goToSection(target);
    }
}

function updateButtons() {
    // Show/Hide Previous button
    document.getElementById('prev-btn').classList.toggle('hidden', currentSection === 1);
    
    // Switch between Next and Submit button
    if (currentSection === totalSections) {
        document.getElementById('next-btn').classList.add('hidden');
        document.getElementById('submit-btn').classList.remove('hidden');
    } else {
        document.getElementById('next-btn').classList.remove('hidden');
        document.getElementById('submit-btn').classList.add('hidden');
    }
}

// 3. Simple Timer Logic
function startTimer(minutes) {
    let seconds = minutes * 60;
    const timerEl = document.getElementById('timer');
    
    const countdown = setInterval(() => {
        let m = Math.floor(seconds / 60);
        let s = seconds % 60;
        timerEl.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        
        if (seconds <= 0) {
            clearInterval(countdown);
            alert("Time is up! Your exam will be submitted automatically.");
            submitExam();
        }
        seconds--;
    }, 1000);
}

// 4. Submission Logic
document.getElementById('submit-btn').addEventListener('click', function() {
    if (confirm('Are you sure you want to submit your exam? This action cannot be undone.')) {
        collectAnswers(); // Collect final answers
        saveAnswers(); // Save final answers
        submitExam();
    }
});

function submitExam() {
    collectAnswers(); // Collect final answers
    saveAnswers(); // Save final answers
    
    // Calculate score
    let score = 0;
    let totalQuestions = 0;
    
    Object.keys(questionsData).forEach(section => {
        questionsData[section].forEach(question => {
            totalQuestions++;
            if (answers[question.id] === question.correct) {
                score++;
            }
        });
    });
    
    // Show results
    const percentage = Math.round((score / totalQuestions) * 100);
    const resultMessage = `Exam submitted successfully!\n\nStudent ID: ${studentId}\nScore: ${score}/${totalQuestions} (${percentage}%)\n\nThank you for completing the examination.`;
    
    alert(resultMessage);
    
    // Clear localStorage
    localStorage.removeItem('exam_answers');
    
    // Reset the page
    location.reload();
}