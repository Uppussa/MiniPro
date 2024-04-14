import http from 'node:http'
import fs from 'node:fs/promises'
import mysql2 from 'mysql2'

const tabla = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'miproyecto'
}

const connection = mysql2.createConnection(tabla)

const handleExportUsuarios = async (req, res) => {
  try {
    const query = 'SELECT * FROM usuarios;'
    const [results] = await connection.promise().query(query)

    const csvData = results.map(user => ({
      id: user.id,
      nombres: user.nombres,
      apellidos: user.apellidos,
      direccion: user.direccion,
      correo: user.correo,
      dni: user.dni,
      edad: user.edad,
      fecha_creacion: user.fecha_creacion,
      telefono: user.telefono
    }))

    const csvHeaders = Object.keys(csvData[0]).join(',')
    const csvRows = csvData.map(user => Object.values(user).join(','))

    const csvContent = `${csvHeaders}\n${csvRows.join('\n')}`

    await fs.writeFile('usuarios.csv', csvContent)

    console.log('Datos exportados a usuarios.csv')
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end('Datos exportados a usuarios.csv')
  } catch (error) {
    console.error(error)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end('Error al exportar datos a CSV')
  }
}

const handleImportUsuarios = async (req, res) => {
  try {
    const csvContent = await fs.readFile('usuarios.csv', 'utf-8')
    const csvRows = csvContent.split('\n').map(row => row.split(','))

    // Filtra las filas vacías
    const usuarios = csvRows.filter(row => row.length > 1)

    // Verificar si los ID o correos electrónicos ya existen en la base de datos
    const existingIds = await connection.promise().query('SELECT id FROM usuarios')
    const existingEmails = await connection.promise().query('SELECT correo FROM usuarios')
    const existingIdsSet = new Set(existingIds[0].map(row => row.id))
    const existingEmailsSet = new Set(existingEmails[0].map(row => row.correo))

    // Insertar solo los usuarios que no existen previamente
    const usuariosToInsert = usuarios.filter(user => !existingIdsSet.has(user[0]) && !existingEmailsSet.has(user[4]))

    // Insertar los datos en la base de datos MySQL
    if (usuariosToInsert.length > 0) {
      const query = 'INSERT INTO usuarios (id, nombres, apellidos, direccion, correo, dni, edad, fecha_creacion, telefono) VALUES ?'
      await connection.promise().query(query, [usuariosToInsert])
    }

    console.log('Datos importados desde usuarios.csv')
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end('Datos importados desde usuarios.csv')
  } catch (error) {
    console.error(error)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end('Error al importar datos desde CSV')
  }
}

const server = http.createServer((req, res) => {
  const { url } = req
  switch (url) {
    case '/api/usuarios/export':
      handleExportUsuarios(req, res)
      break
    case '/api/usuarios/import':
      handleImportUsuarios(req, res)
      break
    default:
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end('Ruta no encontrada')
  }
})

server.listen(8525, () => {
  console.log('Servidor escuchando en el puerto 8525')
})
