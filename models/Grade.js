const { query } = require('../config/database');

class Grade {
  static async create(gradeData) {
    const { enrollment_id, evaluation_type, grade, weight, comments, evaluated_by } = gradeData;
    
    const result = await query(
      `INSERT INTO grades (enrollment_id, evaluation_type, grade, weight, comments, evaluated_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [enrollment_id, evaluation_type, grade, weight, comments, evaluated_by]
    );

    // Actualizar nota final en la inscripción si es necesario
    await this.updateFinalGrade(enrollment_id);
    
    return result.rows[0];
  }

  static async findByEnrollmentId(enrollmentId) {
    const result = await query(
      `SELECT g.*, 
              t.first_name as evaluated_by_first_name, t.last_name as evaluated_by_last_name
       FROM grades g
       LEFT JOIN teachers t ON g.evaluated_by = t.id
       WHERE g.enrollment_id = $1
       ORDER BY g.evaluation_date DESC`,
      [enrollmentId]
    );

    return result.rows;
  }

  static async update(id, updateData) {
    const allowedFields = ['evaluation_type', 'grade', 'weight', 'comments'];
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

    values.push(id);

    const result = await query(
      `UPDATE grades SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    // Actualizar nota final en la inscripción
    if (result.rows[0]) {
      await this.updateFinalGrade(result.rows[0].enrollment_id);
    }

    return result.rows[0];
  }

  static async delete(id) {
    const result = await query(
      'DELETE FROM grades WHERE id = $1 RETURNING *',
      [id]
    );

    // Actualizar nota final en la inscripción
    if (result.rows[0]) {
      await this.updateFinalGrade(result.rows[0].enrollment_id);
    }

    return result.rows[0];
  }

  static async updateFinalGrade(enrollmentId) {
    // Calcular nota final ponderada
    const result = await query(
      `SELECT SUM(grade * weight) as weighted_sum, SUM(weight) as total_weight
       FROM grades 
       WHERE enrollment_id = $1`,
      [enrollmentId]
    );

    const { weighted_sum, total_weight } = result.rows[0];
    
    let finalGrade = null;
    if (weighted_sum && total_weight > 0) {
      finalGrade = weighted_sum / total_weight;
      // Redondear a 2 decimales
      finalGrade = Math.round(finalGrade * 100) / 100;
    }

    await query(
      'UPDATE enrollments SET final_grade = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [finalGrade, enrollmentId]
    );

    return finalGrade;
  }

  static async getCourseGrades(courseAssignmentId) {
    const result = await query(
      `SELECT e.id as enrollment_id, 
              s.student_code,
              u.first_name as student_first_name, u.last_name as student_last_name,
              e.final_grade,
              JSON_AGG(
                JSON_BUILD_OBJECT(
                  'id', g.id,
                  'evaluation_type', g.evaluation_type,
                  'grade', g.grade,
                  'weight', g.weight,
                  'comments', g.comments,
                  'evaluation_date', g.evaluation_date
                ) ORDER BY g.evaluation_date DESC
              ) as grades
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN grades g ON e.id = g.enrollment_id
       WHERE e.course_assignment_id = $1 AND e.status = 'enrolled'
       GROUP BY e.id, s.student_code, u.first_name, u.last_name
       ORDER BY u.last_name, u.first_name`,
      [courseAssignmentId]
    );

    return result.rows;
  }
}

module.exports = Grade;