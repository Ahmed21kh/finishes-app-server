module.exports = {
  // ...
  packagerConfig: {
    icon: 'favicon.ico' // no file extension required
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        certificateFile: './cert.pfx',
        certificatePassword: process.env.CERTIFICATE_PASSWORD
      }
    }
  ]
  // ...
}