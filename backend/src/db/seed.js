require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { prisma } = require('./prisma');

async function seed() {
  console.log('🌱 Seeding database...');

  // Quiz Set 1: Trắc nghiệm
  const quizSet1 = await prisma.quizSet.create({
    data: {
      title: 'Kiến thức tổng hợp',
      description: 'Câu hỏi trắc nghiệm kiến thức tổng hợp',
      type: 'multiple_choice',
      questions: {
        create: [
          {
            order: 1,
            type: 'multiple_choice',
            questionText: 'Thủ đô của Việt Nam là gì?',
            optionA: 'Hồ Chí Minh',
            optionB: 'Hà Nội',
            optionC: 'Đà Nẵng',
            optionD: 'Huế',
            correctAnswer: 'B',
            timeLimit: 20,
            baseScore: 100,
          },
          {
            order: 2,
            type: 'multiple_choice',
            questionText: 'Việt Nam có bao nhiêu tỉnh thành?',
            optionA: '58',
            optionB: '61',
            optionC: '63',
            optionD: '65',
            correctAnswer: 'C',
            timeLimit: 25,
            baseScore: 100,
          },
          {
            order: 3,
            type: 'multiple_choice',
            questionText: 'Sông nào dài nhất Việt Nam?',
            optionA: 'Sông Hồng',
            optionB: 'Sông Đà',
            optionC: 'Sông Mekong',
            optionD: 'Sông Đồng Nai',
            correctAnswer: 'C',
            timeLimit: 20,
            baseScore: 100,
          },
        ],
      },
    },
  });

  // Quiz Set 2: Vua tiếng Việt
  const quizSet2 = await prisma.quizSet.create({
    data: {
      title: 'Vua Tiếng Việt',
      description: 'Điền từ còn thiếu / giải thích thành ngữ',
      type: 'vua_tieng_viet',
      questions: {
        create: [
          {
            order: 1,
            type: 'vua_tieng_viet',
            questionText: 'Hoàn thành câu tục ngữ: "Uống nước nhớ ___"',
            correctAnswer: 'nguồn',
            timeLimit: 15,
            baseScore: 150,
            explanation: 'Uống nước nhớ nguồn - nhắc nhở về lòng biết ơn',
          },
          {
            order: 2,
            type: 'vua_tieng_viet',
            questionText: 'Giải nghĩa: "Thành ngữ nào có nghĩa là làm việc rất chăm chỉ?" (gợi ý: cần...)",',
            correctAnswer: 'cần cù',
            timeLimit: 20,
            baseScore: 150,
          },
          {
            order: 3,
            type: 'vua_tieng_viet',
            questionText: 'Điền vào chỗ trống: "Lời nói chẳng mất tiền ___"',
            correctAnswer: 'mua',
            timeLimit: 15,
            baseScore: 150,
          },
        ],
      },
    },
  });

  console.log(`✅ Đã tạo Quiz Set: "${quizSet1.title}" (${quizSet1.id})`);
  console.log(`✅ Đã tạo Quiz Set: "${quizSet2.title}" (${quizSet2.id})`);
  console.log('🎉 Seed xong!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
