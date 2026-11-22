const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

module.exports = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <TOKEN>

  if (!token) {
    return res.status(401).json({
      status: 'ERROR',
      message: 'Acceso denegado. Token de autenticación ausente.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secreto_studio5_2026');
    req.user = { ...decoded, original_role: decoded.role };

    // Soporte multi-equipo: si el cliente envía el organizador activo en X-Workspace-Organizer-Id,
    // validamos la membresía activa en staff_memberships y aislamos req.user a ese equipo.
    const workspaceOrgId = req.headers['x-workspace-organizer-id'];
    if (workspaceOrgId && workspaceOrgId !== 'personal' && workspaceOrgId !== 'null' && workspaceOrgId !== 'undefined') {
      const memRes = await query(
        `SELECT m.organizer_id, m.module_cartelera, m.module_logistics, m.can_edit_logistics_records,
                org.module_cartelera AS org_cartelera, org.module_logistics AS org_logistics
         FROM staff_memberships m
         JOIN users org ON m.organizer_id = org.id
         WHERE m.staff_user_id = $1 AND m.organizer_id = $2 AND m.status = 'active'
         LIMIT 1`,
        [decoded.id, workspaceOrgId]
      );
      if (memRes.rows.length > 0) {
        const mem = memRes.rows[0];
        req.user.role = 'staff';
        req.user.workgroup_organizer_id = mem.organizer_id;
        req.user.module_cartelera = Boolean(mem.module_cartelera && mem.org_cartelera);
        req.user.module_logistics = Boolean(mem.module_logistics && mem.org_logistics);
        req.user.can_edit_logistics_records = Boolean(mem.can_edit_logistics_records && req.user.module_logistics);
        req.user.active_team_id = mem.organizer_id;
      }
    } else if (decoded.role === 'staff' && decoded.workgroup_organizer_id) {
      const memRes = await query(
        `SELECT can_edit_logistics_records FROM staff_memberships
         WHERE staff_user_id = $1 AND organizer_id = $2 AND status = 'active' LIMIT 1`,
        [decoded.id, decoded.workgroup_organizer_id]
      );
      req.user.can_edit_logistics_records = Boolean(memRes.rows[0]?.can_edit_logistics_records);
    }

    next();
  } catch (err) {
    return res.status(403).json({
      status: 'ERROR',
      message: 'Token de autenticación inválido o expirado.'
    });
  }
};
