import { Op } from 'sequelize';
import { models } from '../../sequelize/models.js';

// Function to fetch data from the database
async function fetchData(date) {
    try {
        const data = await models.dateTime.findAll({
            where: { date },
            include: {
                model: models.course,
                nested: true,
                attributes: ['id', 'name', 'semester'],
                include: {
                    model: models.program,
                    attributes: ['id', 'name'],
                    through: {
                        attributes: [],
                    },
                },
            },
            attributes: [],
        });
        return data;
    } catch (error) {
        throw new Error(`Error fetching data: ${error.message}`);
    }
}

// Function to fetch students from the database
async function fetchStudents(data, orderBy = '') {
    try {
        const students = await models.student.findAll({
            where: {
                [Op.or]: data.flatMap((dateTime) =>
                    dateTime.courses.flatMap((course) =>
                        course.programs.map((program) => ({
                            programId: program.id,
                            semester: course.semester,
                        })),
                    ),
                ),
            },
            order: [[orderBy, 'ASC']],
            attributes: ['name', 'id', 'semester', 'programId', 'rollNumber'],
            raw: true,
        });
        return students;
    } catch (error) {
        throw new Error(`Error fetching students: ${error.message}`);
    }
}

// Function to match students with programs and courses
function matchStudentsWithData(students, data) {
    students.forEach((student) => {
        data.forEach((dateTime) =>
            dateTime.courses.forEach((course) =>
                course.programs.forEach((program) => {
                    if (
                        program.id === student.programId &&
                        course.semester === student.semester
                    ) {
                        student.programName = program.name;
                        student.courseName = course.name;
                        student.courseId = course.id;
                    }
                }),
            ),
        );
    });
}

// Function to group students by courseId
function groupStudentsByCourseId(students) {
    const groupedStudents = {};

    students.forEach((student) => {
        const { courseId } = student;

        if (!groupedStudents[courseId]) {
            groupedStudents[courseId] = [];
        }

        groupedStudents[courseId].push(student);
    });

    return Object.values(groupedStudents);
}

// Main function to execute the code
export default async function getData(date, orderBy = 'rollNumber') {
    try {
        const data = await fetchData(date);
        // console.log(JSON.stringify(data, null, 4));

        const students = await fetchStudents(data, orderBy);
        const totalStudents = students.length;

        // console.log(JSON.stringify(students, null, 4));

        matchStudentsWithData(students, data);

        const exams = groupStudentsByCourseId(students);

        // console.log(JSON.stringify(exams, null, 4));

        return { exams, totalStudents };
    } catch (error) {
        console.error(error.message);
        return null;
    }
}
// getData();
