import { models, sequelize } from '../../sequelize/models.js';

/**
 * Generates a seating matrix for classes based on available rooms.
 * @returns {Object} An object containing the following properties:
 * - `classes` (Array<Class>): An array of classes, each with a seating matrix.
 * - `totalSeats` (number): The total number of seats across all classes.
 */
async function generateSeatingMatrix() {
    /**
     * Represents a class with a seating matrix.
     * @typedef {Object} Class
     * @property {Array<Array<{ occupied: boolean, exam: string }>>} seatingMatrix - The seating matrix for the class.
     * @property {number} id - The ID of the class.
     * @property {number} floor - The floor where the class is located.
     * @property {number} blockId - The ID of the block where the class is located.
     * @property {string} blockName - The name of the block where the class is located.
     * @property {number} seats - The total number of seats in the class.
     */

    /**
     * Represents a block with a name.
     * @typedef {Object} block
     * @property {string} name - The name of the block.
     */

    try {
        const rooms = await models.room.findAll({
            where: { isAvailable: true },
            include: { model: models.block, attributes: { include: ['name'] } },
            raw: true,
            attributes: [
                'id',
                'cols',
                'rows',
                'floor',
                [sequelize.literal('room.cols * room.rows'), 'seats'],
            ],
        });

        /**
         * Represents an array of classes with seating matrices.
         * @type {Array<Class>}
         */
        const classes = [];

        let totalSeats = 0;

        rooms.forEach((room) => {
            totalSeats += room.seats;
            const currentClass = {
                seatingMatrix: Array.from({ length: room.rows }, () =>
                    Array.from({ length: room.cols }, () => ({
                        occupied: false,
                        exam: null,
                        regno: null,
                    })),
                ),
                exams: [],
                id: room.id,
                floor: room.floor,
                blockId: room['block.id'],
                blockName: room['block.name'],
                seats: room.seats,
            };

            classes.push(currentClass);
        });

        // console.log(JSON.stringify(rooms, null, 2));
        console.log(classes.length);

        return { classes, totalSeats };
    } catch (error) {
        console.error('Error generating seating matrix:', error);
        throw error;
    }
}

// Export the function
// generateSeatingMatrix();
export default generateSeatingMatrix;