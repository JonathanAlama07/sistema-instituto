const { query } = require('../config/database');

class Course {
  static async create(courseData) {
    const { code, name, description, credits, hours_per_week, career_id, prerequisite_course_id, created_by } = courseData;
    
    const result = await query(
      `INSERT INTO courses (code, name, description, credits, hours_per_week, career_id, prerequisite_course_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [code, name, description, credits, hours_per_week, career_id, prerequisite_course_id, created_by]
    );
    
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      `SELECT c.*, 
              car.name as career_name, car.code as career_code,
              pre.name as prerequisite_name, pre.code as prerequisite_code,
              u.first_name as created_by_name, u.last_name as created_by_last_name
       FROM courses c
       LEFT JOIN careers car ON c.career_id = car.id
       LEFT JOIN courses pre ON c.prerequisite_course_id = pre.id
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1 AND c.is_active = true`,
      [id]
    );
    return result.rows[0];
  }

  static async findByCode(code) {
    const result = await query(
      `SELECT c.*, car.name as career_name
       FROM courses c
       LEFT JOIN careers car ON c.career_id = car.id
       WHERE c.code = $1 AND c.is_active = true`,
      [code]
    );
    return result.rows[0];
  }

  static async update(id, updateData) {
    const allowedFields = ['name', 'description', 'credits', 'hours_per_week', 'career_id', 'prerequisite_course_id', 'is_active'];
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramCount}`);
        values.push(updateData[key]);
        paramCount++;
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No hay campos válidos para actualizar');
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await query(
      `UPDATE courses SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  static async getAll(filters = {}) {
    const { page = 1, limit = 10, career_id, is_active } = filters;
    const offset = (page - 1) * limit;

    let whereConditions = ['c.is_active IS NOT NULL'];
    const queryParams = [limit, offset];

    if (career_id) {
      queryParams.push(career_id);
      whereConditions.push(`c.career_id = $${queryParams.length}`);
    }

    if (is_active !== undefined) {
      queryParams.push(is_active);
      whereConditions.push(`c.is_active = $${queryParams.length}`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT c.*, 
              car.name as career_name, car.code as career_code,
              pre.name as prerequisite_name,
              u.first_name as created_by_name, u.last_name as created_by_last_name,
              COUNT(*) OVER() as total_count
       FROM courses c
       LEFT JOIN careers car ON c.career_id = car.id
       LEFT JOIN courses pre ON c.prerequisite_course_id = pre.id
       LEFT JOIN users u ON c.created_by = u.id
       ${whereClause}
       ORDER BY c.name ASC
       LIMIT $1 OFFSET $2`,
      queryParams
    );

    return {
      courses: result.rows,
      totalCount: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0
    };
  }

  static async getAvailableCourses(academicCycleId, studentId = null) {
    let studentCondition = '';
    const params = [academicCycleId];

    if (studentId) {
      params.push(studentId);
      studentCondition = `
        AND ca.id NOT IN (
          SELECT course_assignment_id 
          FROM enrollments 
          WHERE student_id = $2 AND status = 'enrolled'
        )
      `;
    }

    const result = await query(
      `SELECT ca.*, 
              c.name as course_name, c.code as course_code, c.credits, c.description,
              car.name as career_name,
              t.first_name as teacher_first_name, t.last_name as teacher_last_name,
              s.name as shift_name, s.start_time, s.end_time,
              ac.year as academic_year, ac.semester as academic_semester,
              COUNT(e.id) as current_enrollments,
              (ca.max_students - COUNT(e.id)) as available_slots
       FROM course_assignments ca
       JOIN courses c ON ca.course_id = c.id
       JOIN careers car ON c.career_id = car.id
       JOIN teachers t ON ca.teacher_id = t.id
       JOIN shifts s ON ca.shift_id = s.id
       JOIN academic_cycles ac ON ca.academic_cycle_id = ac.id
       LEFT JOIN enrollments e ON ca.id = e.course_assignment_id AND e.status = 'enrolled'
       WHERE ca.academic_cycle_id = $1 
         AND ca.is_active = true 
         AND (ca.max_students - COUNT(e.id)) > 0
         ${studentCondition}
       GROUP BY ca.id, c.name, c.code, c.credits, c.description, car.name, 
                t.first_name, t.last_name, s.name, s.start_time, s.end_time,
                ac.year, ac.semester
       ORDER BY car.name, c.name ASC`,
      params
    );

    return result.rows;
  }

  static async getCourseAssignments(courseId, academicCycleId = null) {
    let whereCondition = 'ca.course_id = $1';
    const params = [courseId];

    if (academicCycleId) {
      params.push(academicCycleId);
      whereCondition += ' AND ca.academic_cycle_id = $2';
    }

    const result = await query(
      `SELECT ca.*, 
              t.first_name as teacher_first_name, t.last_name as teacher_last_name,
              s.name as shift_name, s.start_time, s.end_time,
              ac.year as academic_year, ac.semester as academic_semester,
              COUNT(e.id) as enrolled_students
       FROM course_assignments ca
       JOIN teachers t ON ca.teacher_id = t.id
       JOIN shifts s ON ca.shift_id = s.id
       JOIN academic_cycles ac ON ca.academic_cycle_id = ac.id
       LEFT JOIN enrollments e ON ca.id = e.course_assignment_id AND e.status = 'enrolled'
       WHERE ${whereCondition}
       GROUP BY ca.id, t.first_name, t.last_name, s.name, s.start_time, s.end_time,
                ac.year, ac.semester
       ORDER BY ac.year DESC, ac.semester DESC, s.name ASC`,
      params
    );

    return result.rows;
  }
}

module.exports = Course;