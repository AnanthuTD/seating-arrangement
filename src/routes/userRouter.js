import express from 'express';
import {
    getUpcomingExams,
    getUpcomingExamsFromDB,
    retrieveStudentDetails,
} from '../helpers/adminHelpers/studentSeat.js';
import {
    checkSameStudent,
    checkSeatingAvailability,
} from '../middlewares/userMiddleware.js';

const router = express.Router();

/**
 * Get timetable and seating information for a student.
 * @route GET /api/students
 * @param {string} studentId - The student's ID.
 * @returns {object} - The timetable and seating information.
 * @throws {object} - Returns an error object if any error occurs.
 */
router.get(
    '/',
    checkSameStudent,
    checkSeatingAvailability,
    async (req, res) => {
        try {
            const { studentId } = req.query;

            const seatingInfo = await retrieveStudentDetails(studentId);

            if (!seatingInfo) {
                return res
                    .status(204)
                    .json({ error: 'Student details not found' });
            }

            console.log(seatingInfo.timeCode, req.timeCode);

            if (seatingInfo.timeCode !== req.timeCode)
                return res.status(403).json({
                    error: 'Seating arrangement not available at this time.',
                });

            const { programId, semester, openCourseId } = seatingInfo;

            res.cookie('programId', programId);
            res.cookie('semester', semester);
            res.cookie('openCourseId', openCourseId);

            return res.json({ seatingInfo });
        } catch (error) {
            console.error('An error occurred:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    },
);

router.get('/exams', async (req, res) => {
    try {
        const { programId, semester, openCourseId, studentId } = req.cookies;

        if (!programId || !semester) {
            if (!studentId)
                return res.status(400).json({
                    error: 'No necessary data to process the request!',
                });

            try {
                const upcomingExams = await getUpcomingExamsFromDB(studentId);

                return res.status(200).json(upcomingExams);
            } catch (error) {
                console.error('An error occurred:', error);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
        }

        let upcomingExams = [];

        if (programId && semester) {
            upcomingExams = await getUpcomingExams(
                programId,
                semester,
                openCourseId,
            );
        }

        return res.status(200).json(upcomingExams);
    } catch (error) {
        console.error('An error occurred:', error);

        const { studentId } = req.cookies;
        if (!studentId)
            return res
                .status(500)
                .json({ error: 'Failed to load data from redis and db!' });
        try {
            const upcomingExams = await getUpcomingExamsFromDB(studentId);

            return res.status(200).json(upcomingExams);
        } catch (err) {
            console.error('An error occurred:', err);
            return res.status(500).json({ err: 'Internal Server Error' });
        }
    }
});

/* router.get('/exams/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;

        const upcomingExams = await getUpcomingExamsFromDB(studentId);

        return res.status(200).json(upcomingExams);
    } catch (error) {
        console.error('An error occurred:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}); */

export default router;
