const fs = require('fs');
const path = require('path');

const files = ['questions.json', 'questions2.json', 'questions3.json'];
const outputFile = 'questions.sql';

let sql = `CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bank_id INT,
    section VARCHAR(50),
    original_id INT,
    question TEXT,
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    correct_option CHAR(1),
    audio VARCHAR(255) NULL,
    context TEXT NULL,
    passage TEXT NULL
);\n\n`;

function escapeSql(str) {
    if (!str) return 'NULL';
    return "'" + String(str).replace(/'/g, "''") + "'";
}

files.forEach((file, index) => {
    const bankId = index + 1;
    const filePath = path.join(__dirname, file);
    
    if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        for (const [section, questions] of Object.entries(data)) {
            questions.forEach(q => {
                const originalId = q.id;
                const question = escapeSql(q.question);
                const optA = escapeSql(q.options && q.options[0] ? q.options[0] : null);
                const optB = escapeSql(q.options && q.options[1] ? q.options[1] : null);
                const optC = escapeSql(q.options && q.options[2] ? q.options[2] : null);
                const optD = escapeSql(q.options && q.options[3] ? q.options[3] : null);
                const correct = escapeSql(q.correct);
                const audio = escapeSql(q.audio);
                const context = escapeSql(q.context);
                const passage = escapeSql(q.passage);

                sql += `INSERT INTO questions (bank_id, section, original_id, question, option_a, option_b, option_c, option_d, correct_option, audio, context, passage) VALUES (${bankId}, '${section}', ${originalId}, ${question}, ${optA}, ${optB}, ${optC}, ${optD}, ${correct}, ${audio}, ${context}, ${passage});\n`;
            });
        }
    } else {
        console.warn(`Warning: ${file} not found.`);
    }
});

fs.writeFileSync(path.join(__dirname, outputFile), sql);
console.log(`Successfully generated ${outputFile} with all questions.`);