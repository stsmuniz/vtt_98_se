export const database = ["apple", "pear", "grape"];

export default defineEventHandler(async (event) => {
    return {
        database
    }
})