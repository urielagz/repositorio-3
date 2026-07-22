# TODO - Fixs sin cambiar lógica

- [ ] Actualizar `authMiddleware.ts`: validar formato `Authorization: Bearer <token>` y evitar token vacío.
- [ ] Actualizar `rolesMiddleware.ts`: validar existencia de `req.usuario` y `usuario.rol`.
- [ ] Actualizar `MateriaController.ts`: validar `id` (evitar `NaN`) y devolver 400/404 correctamente.
- [ ] Actualizar `MateriaController.ts`: envolver llamadas al repo con try/catch y responder 500 controlado.
- [ ] Ejecutar `tsc` si existe, o al menos `node`/`npm start`/lint si están disponibles.

