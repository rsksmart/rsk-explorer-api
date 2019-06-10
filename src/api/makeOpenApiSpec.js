import swaggerJsdoc from 'swagger-jsdoc'
import pkg from '../../package.json'

const { name, version } = pkg

const options = {
  swaggerDefinition: {
    info: {
      title: name,
      version,
      description: 'explorer API Documentation'
    }
  },
  apis: ['src/api/modules/*.js', 'src/api/docs.yaml']
}

const specs = swaggerJsdoc(options)
console.log(JSON.stringify(specs, null, 2))
