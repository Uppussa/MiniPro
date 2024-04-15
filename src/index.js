// Importar módulos
import http from 'node:http' // Importa el módulo HTTP de Node.js para crear el servidor
import fs from 'node:fs/promises' // Importa el módulo fs de Node.js para manejar archivos de forma asíncrona
import mysql2 from 'mysql2' // Importa el módulo mysql2 para conectarse a la base de datos MySQL

// Configuración de la conexión a la base de datos
const tabla = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'miproyecto'
}

// Establecer la conexión a la base de datos
const connection = mysql2.createConnection(tabla)

// Función para manejar la exportación de usuarios a CSV
const handleExportUsuarios = async (req, res) => {
  try {
    // Consulta SQL para obtener todos los usuarios
    const query = 'SELECT * FROM usuarios;'
    // Ejecutar la consulta y obtener los resultados
    const [results] = await connection.promise().query(query)

    // Convertir los resultados a formato CSV
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

    // Escribir el contenido CSV en un archivo usuarios.csv
    await fs.writeFile('usuarios.csv', csvContent)

    console.log('Datos exportados a usuarios.csv')
    // Enviar respuesta al cliente
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end('Datos exportados a usuarios.csv')
  } catch (error) {
    console.error(error)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end('Error al exportar datos a CSV')
  }
}

// Función para manejar la importación de usuarios desde CSV
const handleImportUsuarios = async (req, res) => {
  try {
    // Leer el contenido del archivo usuarios.csv
    const csvContent = await fs.readFile('usuarios.csv', 'utf-8')
    // Separar el contenido CSV en filas y columnas
    const csvRows = csvContent.split('\n').map(row => row.split(','))

    // Filtrar las filas vacías
    const usuarios = csvRows.filter(row => row.length > 1)

    // Consultar IDs y correos electrónicos existentes en la base de datos
    const existingIds = await connection.promise().query('SELECT id FROM usuarios')
    const existingEmails = await connection.promise().query('SELECT correo FROM usuarios')
    const existingIdsSet = new Set(existingIds[0].map(row => row.id))
    const existingEmailsSet = new Set(existingEmails[0].map(row => row.correo))

    // Insertar solo los usuarios que no existen previamente en la base de datos
    const usuariosToInsert = usuarios.filter(user => !existingIdsSet.has(user[0]) && !existingEmailsSet.has(user[4]))

    // Insertar los nuevos usuarios en la base de datos
    if (usuariosToInsert.length > 0) {
      const query = 'INSERT INTO usuarios (id, nombres, apellidos, direccion, correo, dni, edad, fecha_creacion, telefono) VALUES ?'
      await connection.promise().query(query, [usuariosToInsert])
    }

    console.log('Datos importados desde usuarios.csv')
    // Enviar respuesta al cliente
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end('Datos importados desde usuarios.csv')
  } catch (error) {
    console.error(error)
    // Enviar respuesta de error al cliente
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end('Error al importar datos desde CSV')
  }
}

// Crear el servidor HTTP
const server = http.createServer(async (req, res) => {
  const { url, method } = req

  // Manejar la solicitud dependiendo del método y la URL
  switch (method) {
    case 'GET':
      switch (url) {
        case '/api/usuarios/export':
          await handleExportUsuarios(req, res)
          break
        default:
          // Responder con un error 404 si la ruta no coincide
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end('Ruta no encontrada')
      }
      break
    case 'POST':
      switch (url) {
        case '/api/usuarios/import':
          await handleImportUsuarios(req, res)
          break
        default:
          // Responder con un error 404 si la ruta no coincide
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end('Ruta no encontrada')
      }
      break
    default:
      // Responder con un error 405 si el método no es permitido
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end('Método no permitido')
  }
})

// Escuchar en el puerto 8525
server.listen(8525, () => {
  console.log('Servidor escuchando en el puerto 8525')
})
