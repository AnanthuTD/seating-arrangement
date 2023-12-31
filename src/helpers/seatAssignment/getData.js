import { Op } from 'sequelize';
import { models, sequelize } from '../../sequelize/models.js';

async function fetchExams(date, timeCode) {
    try {
        const data = await models.course.findAll({
            attributes: ['id', 'name', 'semester', 'type'],
            include: [
                {
                    model: models.exam,
                    include: {
                        model: models.dateTime,
                        attributes: [],
                        where: { date, timeCode },
                    },
                    required: true,
                    attributes: ['id'],
                },
                {
                    model: models.program,
                    required: true,
                    attributes: ['id', 'name'],
                },
            ],
        });

        // console.log(JSON.stringify(data, null, 2));

        const openCourses = [];
        const nonOpenCourses = [];

        data.forEach((course) => {
            const courseDetails = {
                courseId: course.id,
                courseName: course.name,
                semester: course.semester,
                courseType: course.type,
                examId: course.exams[0].id,
            };

            course.programs.forEach((program) => {
                const programInfo = {
                    programId: program.id,
                    programName: program.name,
                };

                if (course.type === 'open') {
                    openCourses.push({ ...courseDetails, ...programInfo });
                } else {
                    nonOpenCourses.push({ ...courseDetails, ...programInfo });
                }
            });
        });

        // console.log(JSON.stringify(students, null, 2));

        return { openCourses, nonOpenCourses };
    } catch (error) {
        throw new Error(`Error fetching data: ${error.message}`);
    }
}

// fetchExams(new Date('2023-10-25'));

async function fetchStudents({ nonOpenCourses, openCourses, orderBy = '' }) {
    try {
        const combinedNonOpenCourses = nonOpenCourses.map((value) => ({
            programId: value.programId,
            semester: value.semester,
        }));

        const combinedOpenCourses = openCourses.map((value) => ({
            openCourseId: value.courseId,
            semester: value.semester,
        }));

        const students = await models.student.findAll({
            where: {
                [Op.or]: [...combinedNonOpenCourses, ...combinedOpenCourses],
            },
            include: [
                {
                    model: models.program,
                    attributes: ['name'],
                },
            ],
            order: [[orderBy, 'ASC']],
            attributes: [
                'name',
                'id',
                'semester',
                'programId',
                'rollNumber',
                [sequelize.col('program.name'), 'programName'],
            ],
            raw: true,
        });
        const supplyStudents = await models.student.findAll({
            include: [
                {
                    model: models.supplementary,
                    where: {
                        exam_id: {
                            [Op.in]: [
                                ...nonOpenCourses.map((value) => value.examId),
                                ...openCourses.map((value) => value.examId),
                            ],
                        },
                    },
                    attributes: [],
                    required: true,
                    include: [
                        {
                            model: models.exam,
                            include: [
                                {
                                    model: models.course,
                                },
                            ],
                        },
                    ],
                },
                {
                    model: models.program,
                    attributes: ['name'],
                },
            ],
            order: [[orderBy, 'ASC']],
            attributes: [
                'name',
                'id',
                'semester',
                'programId',
                'rollNumber',
                [sequelize.col('supplementaries.exam_id'), 'examId'],
                [sequelize.col('supplementaries.exam.course.id'), 'courseId'],
                [
                    sequelize.col('supplementaries.exam.course.type'),
                    'courseType',
                ],
                [
                    sequelize.col('supplementaries.exam.course.name'),
                    'courseName',
                ],
                [sequelize.col('program.name'), 'programName'],
            ],
            raw: true,
        });

        // logger(supplyStudents, 'students');

        return [...students, ...supplyStudents];
    } catch (error) {
        throw new Error(`Error fetching students: ${error.message}`);
    }
}

// Function to match students with programs and courses
function matchStudentsWithData(students, data) {
    const groupedStudents = students.map((student) => {
        data.forEach((value) => {
            if (
                !student.courseId &&
                value.programId === student.programId &&
                value.semester === student.semester
            ) {
                student.courseSemester = value.semester;
                student.courseName = value.courseName;
                student.courseId = value.courseId;
                student.examId = value.examId;
                student.courseType = value.courseType;
            }
        });

        return student;
    });
    // logger(groupedStudents, 'grouped students');
    return groupedStudents;
}

// Function to group students by courseId
/**
 *
 * @param {*} students
 * @type {import('./type.js').NestedStudentArray } NestedStudentArray
 * @returns {NestedStudentArray}
 */
function groupStudentsByCourseId(students) {
    const groupedStudents = {};

    students.forEach((student) => {
        const { courseId, courseType, programId } = student;

        if (courseType === 'common') {
            const programCourse = `${programId}-${courseId}`;
            if (!groupedStudents[programCourse]) {
                groupedStudents[programCourse] = [];
            }

            groupedStudents[programCourse].push(student);
        } else {
            if (!groupedStudents[courseId]) {
                groupedStudents[courseId] = [];
            }

            groupedStudents[courseId].push(student);
        }
    });

    // Sorting the nested arrays in descending order based on length
    const sortedGroupedStudents = Object.values(groupedStudents).sort(
        (a, b) => b.length - a.length,
    );

    return sortedGroupedStudents;
}

// Main function to execute the code
export default async function getData({
    date,
    timeCode,
    orderBy = 'rollNumber',
}) {
    try {
        const { nonOpenCourses, openCourses } = await fetchExams(
            date,
            timeCode,
        );
        // console.log(JSON.stringify(data, null, 4));

        const students = await fetchStudents({
            orderBy,
            nonOpenCourses,
            openCourses,
        });
        // console.log(JSON.stringify(students, null, 4));

        const totalStudents = students.length;

        const updateStudents = matchStudentsWithData(students, [
            ...openCourses,
            ...nonOpenCourses,
        ]);
        // console.log(JSON.stringify(updateStudents, null, 4));

        const groupedStudents = groupStudentsByCourseId(updateStudents);

        // console.log(JSON.stringify(groupedStudents, null, 4));

        return [groupedStudents, totalStudents];
    } catch (error) {
        console.error(error.message);
        return null;
    }
}
// getData(new Date('2023-10-25'));
export { fetchExams, groupStudentsByCourseId };
