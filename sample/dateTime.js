import { models } from '../src/sequelize/models.js';

function generateDummyData() {
    const dummyData = [];
    // const timeCodes = ['AN', 'FN'];
    let id = 1;

    for (let day = 1; day <= 20; day += 1) {
        // for (let i = 0; i < 2; i += 1) {
        const date = new Date(); // Use the current date as a starting point
        date.setDate(date.getDate() + day); // Increment the date for each day

        const timeCode = 'AN'; // Use the session to select the time code

        dummyData.push({
            id,
            date: date.toISOString().split('T')[0],
            timeCode,
        });

        id += 1;
        // }
    }

    return dummyData;
}

const tableData = generateDummyData();
// console.log(tableData);
models.dateTime.bulkCreate(tableData);
