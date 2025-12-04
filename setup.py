from setuptools import setup, find_packages

setup(
    name="dev_ops",
    version="0.1.0",
    description="An Agentic Framework for High-Quality Software Development",
    author="Dev_Ops Team",
    packages=find_packages(),
    install_requires=[
        "mcp",
    ],
    entry_points={
        "console_scripts": [
            "dev_ops_server=dev_ops.mcp_server:main",
            "dev_ops=dev_ops.main:main",
        ],
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    license="MIT",
    python_requires=">=3.10",
)
