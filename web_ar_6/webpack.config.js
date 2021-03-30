const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
module.exports = {
    entry: ["./src/index.js", "./public/index.js"],
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, "build"),
        publicPath: "/",
    },
    devServer: {
        hot: true,
        host: "localhost",
        port: 3000,
        historyApiFallback: true,
        contentBase: "./build",
    },
    resolve: {
        alias: {
            "@Context": path.resolve(__dirname, "src/context/"),
        },
        modules: ["./node_modules"],
        extensions: [".js", ".json", ".jsx", ".css"],
    },
    // mode: "development",
    module: {
        rules: [
            {
                test: /\.html$/,
                use: [
                    {
                        loader: "html-loader",
                        options: { minimize: true },
                    },
                ],
            },
            {
                test: /\.js$/,
                use: {
                    loader: "babel-loader",
                },
                exclude: "/node_modules/",
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./public/index.html",
            filename: "index.html",
        }),
    ],
};
